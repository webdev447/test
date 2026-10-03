import { getAdminOrders } from "@/app/actions/admin";
import { ticketKindLabel } from "@/lib/ticket-label";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">ออเดอร์ทั้งหมด</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        ทั้งหมด {orders.length.toLocaleString("th-TH")} รายการ
      </p>

      {orders.length === 0 ? (
        <p className="mt-5 text-sm text-foreground-muted">ยังไม่มีออเดอร์</p>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-border bg-background-card p-4 shadow-sm shadow-blue-950/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-foreground">
                  {order.memberName ?? "ไม่ทราบชื่อ"}
                </span>
                <span className="text-xs text-foreground-muted">
                  {new Date(order.createdAt).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    order.status === "paid"
                      ? "bg-success/15 text-success"
                      : "bg-gold/15 text-gold-light"
                  }`}
                >
                  {order.status === "paid" ? "ชำระเงินแล้ว" : order.status}
                </span>
              </div>

              <span className="mt-2 inline-block rounded-full bg-background-soft px-2.5 py-1 text-xs font-medium text-foreground-muted">
                {order.serviceType === "shipping" ? "จัดส่งลอตเตอรี่ถึงบ้าน" : "เช่าพื้นที่จัดเก็บ"}
              </span>

              <div className="mt-3 divide-y divide-border/60">
                {order.items.map((item) => (
                  <div
                    key={item.ticketId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-semibold tracking-widest text-gold-light">
                      {item.number}{" "}
                      <span className="text-xs font-normal tracking-normal text-foreground-muted">
                        ({ticketKindLabel(item.qty)})
                      </span>
                    </span>
                    <span className="text-foreground-muted">
                      {item.qty} ใบ × {item.price.toLocaleString("th-TH")} บาท
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-3 text-sm font-semibold">
                <span className="text-foreground-muted">รวม {order.totalCount} ใบ</span>
                <span className="text-gold-light">
                  {order.totalPrice.toLocaleString("th-TH")} บาท
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
