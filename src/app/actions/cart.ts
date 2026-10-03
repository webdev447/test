"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Ticket } from "@/lib/mock-tickets";
import {
  availableQuantity,
  HOLD_MINUTES,
  releaseExpiredHolds,
  SERVICE_FEE_PER_TICKET,
  type ServiceType,
} from "@/lib/cart-store";

export type { ServiceType };

export type ServerCartItem = {
  id: string; // ticket id
  number: string;
  price: number;
  qty: number;
  reservedUntil: string; // ISO timestamp — this hold expires and the ticket
  // returns to stock for other buyers if checkout hasn't happened by then.
};

// A guest (localStorage) cart item, picked before signing in — no hold
// timestamp yet, since it was never reserved server-side.
export type GuestCartItem = Omit<ServerCartItem, "reservedUntil">;

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อนถึงจะใช้ตะกร้าที่ผูกกับบัญชีได้");
  return userId;
}

export async function getServerCart(): Promise<ServerCartItem[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const db = supabaseAdmin();
  await releaseExpiredHolds(db);

  const { data, error } = await db
    .from("cart_items")
    .select("ticket_id, number, price, qty, reserved_until")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.ticket_id,
    number: row.number,
    price: row.price,
    qty: row.qty,
    reservedUntil: row.reserved_until,
  }));
}

export async function addServerCartItem(ticket: Ticket) {
  const userId = await requireUserId();
  const db = supabaseAdmin();

  // Everything (cleanup, availability check, upsert) happens inside a single
  // Postgres function call — one network round-trip instead of several back
  // and forth, which is what made "add to cart" feel slow. See the
  // add_to_cart() migration in supabase/schema.sql.
  const { error } = await db.rpc("add_to_cart", {
    p_user_id: userId,
    p_ticket_id: ticket.id,
    p_number: ticket.number,
    p_price: ticket.price,
    p_ticket_quantity: ticket.quantity,
    p_hold_minutes: HOLD_MINUTES,
  });
  if (error) {
    // The function raises a plain Thai message on "no stock left" — anything
    // else is a real/unexpected DB error.
    throw new Error(error.message || "เพิ่มลงตะกร้าไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

export async function removeServerCartItem(ticketId: string) {
  const userId = await requireUserId();
  const { error } = await supabaseAdmin()
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("ticket_id", ticketId);
  if (error) throw error;
}

export async function clearServerCart() {
  const userId = await requireUserId();
  const { error } = await supabaseAdmin()
    .from("cart_items")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// Merge a guest (localStorage) cart into the signed-in user's server cart —
// called once right after login so items picked before signing in aren't lost.
// Stock may have moved on while they were browsing signed out, so each item
// is still capped to what's actually available; anything that no longer fits
// is silently dropped rather than blocking the whole merge.
export async function mergeGuestCart(guestItems: GuestCartItem[]) {
  if (guestItems.length === 0) return;
  const userId = await requireUserId();
  const db = supabaseAdmin();
  await releaseExpiredHolds(db);

  const holdUntil = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

  const { data: ticketRows, error: ticketError } = await db
    .from("tickets")
    .select("id, quantity")
    .in(
      "id",
      guestItems.map((i) => i.id)
    );
  if (ticketError) throw ticketError;
  const quantityByTicketId = new Map((ticketRows ?? []).map((t) => [t.id, t.quantity]));

  for (const item of guestItems) {
    const totalQuantity = quantityByTicketId.get(item.id) ?? item.qty;

    const { data: existing, error: readError } = await db
      .from("cart_items")
      .select("qty")
      .eq("user_id", userId)
      .eq("ticket_id", item.id)
      .maybeSingle();
    if (readError) throw readError;

    const available = await availableQuantity(db, item.id, totalQuantity, userId);
    const addQty = Math.min(item.qty, Math.max(available - (existing?.qty ?? 0), 0));
    if (addQty <= 0) continue;

    if (existing) {
      const { error } = await db
        .from("cart_items")
        .update({ qty: existing.qty + addQty, reserved_until: holdUntil })
        .eq("user_id", userId)
        .eq("ticket_id", item.id);
      if (error) throw error;
    } else {
      const { error } = await db.from("cart_items").insert({
        user_id: userId,
        ticket_id: item.id,
        number: item.number,
        price: item.price,
        qty: addQty,
        reserved_until: holdUntil,
      });
      if (error) throw error;
    }
  }
}

// Turns the current server cart into an order, then empties the cart.
// `serviceType` picks how the physical tickets are handled after purchase —
// never trust a price from the client, only the choice; the fee is looked up
// server-side from SERVICE_FEE_PER_TICKET.
export async function checkout(serviceType: ServiceType = "storage") {
  const userId = await requireUserId();
  const safeServiceType: ServiceType =
    serviceType === "shipping" ? "shipping" : "storage";
  const db = supabaseAdmin();
  // Drop any holds that already lapsed first — what's left below is
  // guaranteed to still be validly reserved for this user.
  await releaseExpiredHolds(db);

  const { data: items, error: readError } = await db
    .from("cart_items")
    .select("ticket_id, number, price, qty")
    .eq("user_id", userId);
  if (readError) throw readError;
  if (!items || items.length === 0) {
    throw new Error("หมดเวลาจองสลากในตะกร้าแล้ว กรุณาเลือกใหม่อีกครั้ง");
  }

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const ticketsPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const serviceFee = totalCount * SERVICE_FEE_PER_TICKET[safeServiceType];
  const totalPrice = ticketsPrice + serviceFee;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: userId,
      total_count: totalCount,
      total_price: totalPrice,
      service_type: safeServiceType,
      service_fee: serviceFee,
    })
    .select("id")
    .single();
  if (orderError) throw orderError;

  const { error: itemsError } = await db.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      ticket_id: i.ticket_id,
      number: i.number,
      price: i.price,
      qty: i.qty,
    }))
  );
  if (itemsError) throw itemsError;

  await clearServerCart();

  return {
    orderId: order.id as string,
    totalCount,
    totalPrice,
    ticketsPrice,
    serviceFee,
    serviceType: safeServiceType,
  };
}
