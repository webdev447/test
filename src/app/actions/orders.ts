"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type OrderSummary = {
  id: string;
  createdAt: string;
  totalCount: number;
  totalPrice: number;
  status: string;
  serviceType: "storage" | "shipping";
  serviceFee: number;
  items: { ticketId: string; number: string; price: number; qty: number }[];
};

export async function getPurchasedCount(): Promise<number> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return 0;

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("total_count")
    .eq("user_id", userId);
  if (error) throw error;

  return (data ?? []).reduce((sum, o) => sum + o.total_count, 0);
}

export async function getOrders(): Promise<OrderSummary[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data: orders, error } = await supabaseAdmin()
    .from("orders")
    .select("id, created_at, total_count, total_price, status, service_type, service_fee")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await supabaseAdmin()
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
      .map((i) => ({
        ticketId: i.ticket_id,
        number: i.number,
        price: i.price,
        qty: i.qty,
      })),
  }));
}
