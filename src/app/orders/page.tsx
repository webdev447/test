import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getOrders } from "@/app/actions/orders";
import OrdersList from "@/components/OrdersList";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const orders = await getOrders();
  const totalTickets = orders.reduce((sum, o) => sum + o.totalCount, 0);
  const totalSpent = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
          <SafeIcon />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
          สลากที่ซื้อแล้ว
        </h1>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-gold" />

        {orders.length > 0 && (
          <div className="mx-auto mt-5 flex max-w-xs items-stretch overflow-hidden rounded-2xl border border-border bg-background-card shadow-sm shadow-blue-950/5">
            <div className="flex-1 border-r border-border px-4 py-3">
              <p className="text-xs text-foreground-muted">สลากทั้งหมด</p>
              <p className="mt-1 text-lg font-bold text-gold-light">{totalTickets} ใบ</p>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="text-xs text-foreground-muted">ยอดซื้อรวม</p>
              <p className="mt-1 text-lg font-bold text-gold-light">
                {totalSpent.toLocaleString("th-TH")}
              </p>
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-border bg-background-card px-6 py-16 text-center shadow-sm shadow-blue-950/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background-soft text-gold">
            <TicketIcon />
          </span>
          <p className="mt-4 text-foreground-muted">ยังไม่มีประวัติการซื้อสลาก</p>
          <Link
            href="/shop"
            className="btn-gold mt-5 inline-block rounded-full px-6 py-3 text-sm font-semibold text-background"
          >
            ไปเลือกซื้อสลาก
          </Link>
        </div>
      ) : (
        <OrdersList orders={orders} />
      )}
    </div>
  );
}

function SafeIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5v0M12 15.5v0M8.5 12h0M15.5 12h0" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}
