"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminUserId } from "@/lib/admin-auth";
import type { OrderSummary } from "@/app/actions/orders";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Every admin action re-checks this itself (not just the layout), same
// defensive pattern as the LINE-session checks used everywhere else in the app.
async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงส่วนนี้");
  }
  return userId as string;
}

export type AdminStats = {
  memberCount: number;
  ticketsSold: number;
  ticketsRemaining: number;
  totalRevenue: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const db = supabaseAdmin();

  const [
    { count: memberCount, error: memberError },
    { data: activeTickets, error: activeError },
    { data: allOrderItems, error: itemsError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("tickets").select("id, quantity").eq("is_active", true),
    db.from("order_items").select("ticket_id, qty"),
    db.from("orders").select("total_price"),
  ]);
  if (memberError) throw memberError;
  if (activeError) throw activeError;
  if (itemsError) throw itemsError;
  if (ordersError) throw ordersError;

  const soldByTicket = new Map<string, number>();
  for (const row of allOrderItems ?? []) {
    soldByTicket.set(row.ticket_id, (soldByTicket.get(row.ticket_id) ?? 0) + row.qty);
  }

  const ticketsRemaining = (activeTickets ?? []).reduce(
    (sum, t) => sum + Math.max(t.quantity - (soldByTicket.get(t.id) ?? 0), 0),
    0
  );
  const ticketsSold = (allOrderItems ?? []).reduce((sum, r) => sum + r.qty, 0);
  const totalRevenue = (orders ?? []).reduce((sum, o) => sum + o.total_price, 0);

  return {
    memberCount: memberCount ?? 0,
    ticketsSold,
    ticketsRemaining,
    totalRevenue,
  };
}

export type AdminMember = {
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: string;
  lastLoginAt: string;
  ticketsBought: number;
  totalSpent: number;
};

export async function getAdminMembers(): Promise<AdminMember[]> {
  await requireAdmin();
  const db = supabaseAdmin();

  const [{ data: users, error: usersError }, { data: orders, error: ordersError }] =
    await Promise.all([
      db.from("users").select("user_id, name, image, created_at, last_login_at"),
      db.from("orders").select("user_id, total_count, total_price"),
    ]);
  if (usersError) throw usersError;
  if (ordersError) throw ordersError;

  const byUser = new Map<string, { ticketsBought: number; totalSpent: number }>();
  for (const row of orders ?? []) {
    const existing = byUser.get(row.user_id) ?? { ticketsBought: 0, totalSpent: 0 };
    existing.ticketsBought += row.total_count;
    existing.totalSpent += row.total_price;
    byUser.set(row.user_id, existing);
  }

  return (users ?? [])
    .map((u) => ({
      userId: u.user_id,
      name: u.name,
      image: u.image,
      joinedAt: u.created_at,
      lastLoginAt: u.last_login_at,
      ticketsBought: byUser.get(u.user_id)?.ticketsBought ?? 0,
      totalSpent: byUser.get(u.user_id)?.totalSpent ?? 0,
    }))
    .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
}

// Same shape as getOrders() in src/app/actions/orders.ts, but for any
// member (admin-only) rather than just the signed-in user.
export async function getAdminMemberOrders(userId: string): Promise<OrderSummary[]> {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: orders, error } = await db
    .from("orders")
    .select("id, created_at, total_count, total_price, status, service_type, service_fee")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("order_id, ticket_id, number, price, qty")
    .in("order_id", orderIds);
  if (itemsError) throw itemsError;

  return orders.map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    totalCount: o.total_count,
    totalPrice: o.total_price,
    status: o.status,
    serviceType: (o.service_type as "storage" | "shipping") ?? "storage",
    serviceFee: o.service_fee ?? 0,
    items: (items ?? [])
      .filter((i) => i.order_id === o.id)
      .map((i) => ({ ticketId: i.ticket_id, number: i.number, price: i.price, qty: i.qty })),
  }));
}

export type AdminOrder = OrderSummary & {
  userId: string;
  memberName: string | null;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  await requireAdmin();
  const db = supabaseAdmin();

  const [
    { data: orders, error: ordersError },
    { data: users, error: usersError },
  ] = await Promise.all([
    db
      .from("orders")
      .select("id, user_id, created_at, total_count, total_price, status, service_type, service_fee")
      .order("created_at", { ascending: false }),
    db.from("users").select("user_id, name"),
  ]);
  if (ordersError) throw ordersError;
  if (usersError) throw usersError;
  if (!orders || orders.length === 0) return [];

  const nameByUser = new Map((users ?? []).map((u) => [u.user_id, u.name]));

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("order_id, ticket_id, number, price, qty")
    .in("order_id", orderIds);
  if (itemsError) throw itemsError;

  return orders.map((o) => ({
    id: o.id,
    userId: o.user_id,
    memberName: nameByUser.get(o.user_id) ?? null,
    createdAt: o.created_at,
    totalCount: o.total_count,
    totalPrice: o.total_price,
    status: o.status,
    serviceType: (o.service_type as "storage" | "shipping") ?? "storage",
    serviceFee: o.service_fee ?? 0,
    items: (items ?? [])
      .filter((i) => i.order_id === o.id)
      .map((i) => ({ ticketId: i.ticket_id, number: i.number, price: i.price, qty: i.qty })),
  }));
}

export type AdminTicket = {
  id: string;
  number: string;
  quantity: number;
  price: number;
  isNicePrefix: boolean;
  drawDate: string;
  isActive: boolean;
  sold: number;
  remaining: number;
  createdAt: string;
  imageUrl: string | null;
};

export async function getAdminTickets(): Promise<AdminTicket[]> {
  await requireAdmin();
  const db = supabaseAdmin();

  const [{ data: tickets, error: ticketsError }, { data: orderItems, error: itemsError }] =
    await Promise.all([
      db
        .from("tickets")
        .select(
          "id, number, quantity, price, is_nice_prefix, draw_date, is_active, created_at, image_url"
        )
        .order("created_at", { ascending: false }),
      db.from("order_items").select("ticket_id, qty"),
    ]);
  if (ticketsError) throw ticketsError;
  if (itemsError) throw itemsError;

  const soldByTicket = new Map<string, number>();
  for (const row of orderItems ?? []) {
    soldByTicket.set(row.ticket_id, (soldByTicket.get(row.ticket_id) ?? 0) + row.qty);
  }

  return (tickets ?? []).map((t) => {
    const sold = soldByTicket.get(t.id) ?? 0;
    return {
      id: t.id,
      number: t.number,
      quantity: t.quantity,
      price: t.price,
      isNicePrefix: t.is_nice_prefix,
      drawDate: t.draw_date,
      isActive: t.is_active,
      sold,
      remaining: Math.max(t.quantity - sold, 0),
      createdAt: t.created_at,
      imageUrl: t.image_url,
    };
  });
}

// Uploads a real photo of the physical ticket to Supabase Storage and points
// this listing at it. imageBase64 is a data URI straight from FileReader on
// the client (same pattern as the payment-slip upload in
// src/app/actions/payment.ts).
export async function uploadTicketImage(ticketId: string, imageBase64: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("รูปภาพไม่ถูกต้อง");
  const [, mimeType, base64Data] = match;
  const extension = mimeType.split("/")[1] ?? "jpg";
  const buffer = Buffer.from(base64Data, "base64");

  const path = `${ticketId}-${Date.now()}.${extension}`;
  const { error: uploadError } = await db.storage
    .from("ticket-photos")
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = db.storage.from("ticket-photos").getPublicUrl(path);

  const { error: updateError } = await db
    .from("tickets")
    .update({ image_url: publicUrl })
    .eq("id", ticketId);
  if (updateError) throw updateError;

  return publicUrl;
}

export async function createTicket(input: {
  number: string;
  quantity: number;
  price: number;
  isNicePrefix: boolean;
  drawDate: string;
}) {
  await requireAdmin();
  const number = input.number.replace(/\D/g, "");
  if (number.length !== 6) throw new Error("เลขต้องมี 6 หลัก");
  if (input.quantity < 1) throw new Error("จำนวนใบต้องมากกว่า 0");
  if (input.price < 1) throw new Error("ราคาต้องมากกว่า 0");
  if (!input.drawDate.trim()) throw new Error("กรุณาระบุงวด");

  const { error } = await supabaseAdmin().from("tickets").insert({
    number,
    quantity: input.quantity,
    price: input.price,
    is_nice_prefix: input.isNicePrefix,
    draw_date: input.drawDate.trim(),
  });
  if (error) throw error;
}

export async function setTicketActive(id: string, isActive: boolean) {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("tickets")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTicket(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin().from("tickets").delete().eq("id", id);
  if (error) throw error;
}

// "เริ่มงวดใหม่" — hides every currently-active ticket in one step (kept in
// the table for history, not deleted) so the admin can start adding the next
// draw's fresh numbers without manually deactivating the old ones one by one.
export async function deactivateAllTickets() {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("tickets")
    .update({ is_active: false })
    .eq("is_active", true);
  if (error) throw error;
}
