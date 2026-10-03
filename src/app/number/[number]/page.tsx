import Link from "next/link";
import { notFound } from "next/navigation";
import { getNumberPageStats } from "@/app/actions/lottery";
import type { NumberStats } from "@/lib/lottery-stats";
import StatsDisclaimer from "@/components/StatsDisclaimer";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

type Params = { number: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { number } = await params;
  const result = await getNumberPageStats(number);

  const kindLabel = number.length === 2 ? "เลขท้าย 2 ตัว" : "เลขหน้า-ท้าย 3 ตัว";
  const title = `สถิติ${kindLabel} ${number} ออกบ่อยแค่ไหน ย้อนหลัง | เจเคลอตเตอรี่`;

  if (!result.ok) {
    return {
      title,
      description: `ดูสถิติ${kindLabel} ${number} จากข้อมูลผลสลากย้อนหลัง พร้อมประวัติการออกและความถี่แยกตามปี`,
    };
  }

  const totalCount = result.blocks.reduce((sum, b) => sum + b.count, 0);
  const lastSeen = result.blocks.find((b) => b.lastSeen)?.lastSeen?.drawDateThai;
  const description = lastSeen
    ? `เลข ${number} เคยออกเป็น${kindLabel}มาแล้ว ${totalCount} ครั้ง ล่าสุดงวดวันที่ ${lastSeen} ดูประวัติเต็มและกราฟความถี่รายปีจากฐานข้อมูลผลสลากจริง`
    : `เลข ${number} ยังไม่เคยออกเป็น${kindLabel}ในฐานข้อมูลที่มี ดูสถิติเลขอื่นและผลสลากย้อนหลังทั้งหมดได้ที่เจเคลอตเตอรี่`;

  return { title, description };
}

export default async function NumberStatsPage({ params }: { params: Promise<Params> }) {
  const { number } = await params;
  const result = await getNumberPageStats(number);

  if (!result.ok) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "หน้าแรก", href: "/" },
          { name: "สถิติ", href: "/statistics" },
          { name: result.digits, href: `/number/${result.digits}` },
        ]}
      />

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <Link href="/statistics" className="hover:text-gold-light">
          สถิติ
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">{result.digits}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
        สถิติเลข {result.digits}
      </h1>

      <div className="mt-6 space-y-6">
        {result.blocks.map((stats) => (
          <NumberStatsBlock key={stats.category} stats={stats} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/statistics"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          ← ค้นหาเลขอื่น
        </Link>
        <Link
          href="/results"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          ผลสลากย้อนหลังทั้งหมด
        </Link>
      </div>

      <div className="mt-6">
        <StatsDisclaimer />
      </div>
    </div>
  );
}

function NumberStatsBlock({ stats }: { stats: NumberStats }) {
  const maxYearCount = Math.max(1, ...Object.values(stats.byYear));
  const years = Object.entries(stats.byYear).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-2xl border border-border bg-background-card p-5 shadow-sm shadow-blue-950/5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
        {stats.categoryLabel}
      </h2>

      <p className="mt-3 text-3xl font-bold text-foreground">
        {stats.count.toLocaleString("th-TH")}{" "}
        <span className="text-base font-medium text-foreground-muted">ครั้ง</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="พบล่าสุด"
          value={stats.lastSeen ? stats.lastSeen.drawDateThai : "ไม่พบ"}
        />
        <MiniStat
          label="พบครั้งแรก"
          value={stats.firstSeen ? stats.firstSeen.drawDateThai : "ไม่พบ"}
        />
        <MiniStat
          label="ระยะห่างเฉลี่ย"
          value={stats.gaps.averageDays !== null ? `${stats.gaps.averageDays} วัน` : "—"}
        />
        <MiniStat
          label="งวดที่ไม่พบล่าสุด"
          value={
            stats.gaps.drawsSinceLastSeen !== null
              ? `${stats.gaps.drawsSinceLastSeen} งวด`
              : "—"
          }
        />
      </div>

      {years.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            ความถี่รายปี
          </h3>
          <div className="mt-2 space-y-1.5">
            {years.map(([year, count]) => (
              <div key={year} className="flex items-center gap-2 text-xs">
                <span className="w-10 shrink-0 text-foreground-muted">{year}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-background-soft">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${(count / maxYearCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-semibold text-foreground">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.history.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            ประวัติการออก
          </h3>
          <table className="mt-2 w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="text-foreground-muted">
                <th className="pb-1.5 font-medium">งวด</th>
                <th className="pb-1.5 font-medium">รางวัลที่ 1</th>
                <th className="pb-1.5 font-medium">{stats.categoryLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {stats.history.slice(0, 20).map((draw) => (
                <tr key={draw.id}>
                  <td className="py-1.5 text-foreground-muted">{draw.drawDateThai}</td>
                  <td className="py-1.5 tracking-widest text-foreground">{draw.firstPrize}</td>
                  <td className="py-1.5 font-semibold tracking-widest text-gold-light">
                    {stats.digits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background-soft px-3 py-2.5">
      <p className="text-[11px] text-foreground-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
