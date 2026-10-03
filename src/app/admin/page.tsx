import { getAdminStats } from "@/app/actions/admin";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "จำนวนสมาชิก", value: stats.memberCount.toLocaleString("th-TH"), suffix: "คน" },
    { label: "สลากขายแล้ว", value: stats.ticketsSold.toLocaleString("th-TH"), suffix: "ใบ" },
    { label: "สลากคงเหลือ", value: stats.ticketsRemaining.toLocaleString("th-TH"), suffix: "ใบ" },
    { label: "ยอดขายรวม", value: stats.totalRevenue.toLocaleString("th-TH"), suffix: "บาท" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">ภาพรวม</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-background-card p-5 shadow-sm shadow-blue-950/5"
          >
            <p className="text-sm text-foreground-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gold-light">
              {card.value} <span className="text-sm font-medium text-foreground-muted">{card.suffix}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
