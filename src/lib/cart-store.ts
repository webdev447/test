import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Shared low-level cart/stock-hold helpers — used by both the cart actions
// (src/app/actions/cart.ts) and the payment/slip-verification action
// (src/app/actions/payment.ts). Lives outside any "use server" file since
// those may only export async functions, not plain constants like
// SERVICE_FEE_PER_TICKET.

export type ServiceType = "storage" | "shipping";

// How the customer's physical tickets are handled after purchase — priced
// per ticket, charged on top of the ticket face value.
export const SERVICE_FEE_PER_TICKET: Record<ServiceType, number> = {
  storage: 20, // เช่าพื้นที่จัดเก็บ — 1 ใบ ต่อ 1 ช่อง ตรวจและโอนเงินรางวัลให้อัตโนมัติ
  shipping: 50, // จัดส่งสลากตัวจริงถึงบ้าน
};

// How long adding a ticket to the cart holds it out of stock for everyone
// else. If the customer hasn't checked out by then, the hold lapses and the
// ticket becomes purchasable again — enforced lazily (no cron job needed):
// every cart read/write first deletes any cart row past its own deadline.
export const HOLD_MINUTES = 10;

export type Db = ReturnType<typeof supabaseAdmin>;

export async function releaseExpiredHolds(db: Db) {
  const { error } = await db
    .from("cart_items")
    .delete()
    .lt("reserved_until", new Date().toISOString());
  if (error) throw error;
}

// How many copies of this ticket number are still free to reserve — total
// stock minus everyone else's still-active hold minus what's already sold.
// The two reads are independent, so they run concurrently rather than
// waiting on each other one at a time.
export async function availableQuantity(
  db: Db,
  ticketId: string,
  totalQuantity: number,
  excludeUserId: string
) {
  const [{ data: heldRows, error: heldError }, { data: soldRows, error: soldError }] =
    await Promise.all([
      db
        .from("cart_items")
        .select("user_id, qty")
        .eq("ticket_id", ticketId)
        .gt("reserved_until", new Date().toISOString()),
      db.from("order_items").select("qty").eq("ticket_id", ticketId),
    ]);
  if (heldError) throw heldError;
  if (soldError) throw soldError;

  const heldByOthers = (heldRows ?? [])
    .filter((r) => r.user_id !== excludeUserId)
    .reduce((sum, r) => sum + r.qty, 0);
  const sold = (soldRows ?? []).reduce((sum, r) => sum + r.qty, 0);

  return totalQuantity - heldByOthers - sold;
}
