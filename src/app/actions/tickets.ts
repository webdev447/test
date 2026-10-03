"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Ticket } from "@/lib/mock-tickets";

// The current draw's sellable catalog — added via the admin back-office at
// /admin/tickets. Public read (no auth needed), same as before.
export async function getTickets(): Promise<Ticket[]> {
  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .select("id, number, quantity, price, is_nice_prefix, draw_date, image_url")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    quantity: row.quantity,
    price: row.price,
    isNicePrefix: row.is_nice_prefix,
    drawDate: row.draw_date,
    imageUrl: row.image_url,
  }));
}

export type TicketAvailability = {
  availableQty: number;
  // ISO timestamp of the soonest active hold expiring on this ticket — only
  // set while availableQty <= 0, so the shop page can show "จองแล้ว" with a
  // countdown. Stays null once the ticket is sold out for good (no more
  // holds left to expire).
  releaseAt: string | null;
};

// Public read (no auth needed) — how many copies of each ticket number are
// still free to add to a cart, considering everyone else's active holds
// (see src/app/actions/cart.ts) and what's already sold. Polled from the
// shop/home pages so the "จองแล้ว" ribbon reflects other buyers in near
// real time. Covers every ticket ever listed (not just the active draw) so
// a page that's still showing a just-deactivated batch doesn't error out.
export async function getTicketAvailability(): Promise<Record<string, TicketAvailability>> {
  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const [
    { data: ticketRows, error: ticketError },
    { data: soldRows, error: soldError },
    { data: heldRows, error: heldError },
  ] = await Promise.all([
    db.from("tickets").select("id, quantity"),
    db.from("order_items").select("ticket_id, qty"),
    db.from("cart_items").select("ticket_id, qty, reserved_until").gt("reserved_until", nowIso),
  ]);
  if (ticketError) throw ticketError;
  if (soldError) throw soldError;
  if (heldError) throw heldError;

  const soldByTicket = new Map<string, number>();
  for (const row of soldRows ?? []) {
    soldByTicket.set(row.ticket_id, (soldByTicket.get(row.ticket_id) ?? 0) + row.qty);
  }

  const heldByTicket = new Map<string, { qty: number; earliest: string }>();
  for (const row of heldRows ?? []) {
    const existing = heldByTicket.get(row.ticket_id);
    if (existing) {
      existing.qty += row.qty;
      if (row.reserved_until < existing.earliest) existing.earliest = row.reserved_until;
    } else {
      heldByTicket.set(row.ticket_id, { qty: row.qty, earliest: row.reserved_until });
    }
  }

  const result: Record<string, TicketAvailability> = {};
  for (const ticket of ticketRows ?? []) {
    const sold = soldByTicket.get(ticket.id) ?? 0;
    const held = heldByTicket.get(ticket.id);
    const availableQty = ticket.quantity - sold - (held?.qty ?? 0);
    result[ticket.id] = {
      availableQty,
      releaseAt: availableQty <= 0 ? (held?.earliest ?? null) : null,
    };
  }
  return result;
}
