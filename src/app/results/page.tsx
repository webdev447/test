import Link from "next/link";
import { getAllDrawsLite } from "@/app/actions/lottery";
import StatsDisclaimer from "@/components/StatsDisclaimer";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { getUpcomingDrawDates, formatThaiDate } from "@/lib/draw-schedule";

export const metadata = {
  title: "ตรวจหวยย้อนหลัง ผลสลากกินแบ่งรัฐบาลทุกงวด | เจเคลอตเตอรี่",
  description:
    "ตรวจหวยย้อนหลังทุกงวด รางวัลที่ 1 เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว ครบทุกวันที่ 1 และ 16 ค้นหาสถิติเลขที่สนใจต่อได้ทันที",
};

// Without this, Next.js prerenders the page once at build time and freezes
// it — new draws an admin confirms, and the "งวดถัดไป" date rolling forward
// day by day, would never show up until the next deploy. Regenerating
// every 5 minutes keeps both current with barely any extra DB load.
export const revalidate = 300;

export default async function ResultsPage() {
  const draws = await getAllDrawsLite();
  const [nextDrawDate] = getUpcomingDrawDates(1);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "หน้าแรก", href: "/" },
          { name: "ผลสลากย้อนหลัง", href: "/results" },
        ]}
      />

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">ผลสลากย้อนหลัง</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">ผลสลากย้อนหลัง</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        ทั้งหมด {draws.length.toLocaleString("th-TH")} งวด
      </p>

      {nextDrawDate && (
        <Link
          href={`/results/${nextDrawDate}`}
          className="mt-4 flex items-center justify-between rounded-2xl border border-gold bg-gold/5 px-5 py-3.5 text-sm transition-colors hover:bg-gold/10"
        >
          <span className="font-medium text-foreground">
            งวดถัดไป: วันที่ {formatThaiDate(nextDrawDate)}
          </span>
          <span className="font-semibold text-gold-light">เตรียมตรวจที่นี่ →</span>
        </Link>
      )}

      {draws.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">ยังไม่มีข้อมูลผลสลากในระบบ</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-background-card">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-foreground-muted">
                <th className="px-4 py-3 font-medium">งวดวันที่</th>
                <th className="px-4 py-3 font-medium">รางวัลที่ 1</th>
                <th className="px-4 py-3 font-medium">เลขหน้า 3 ตัว</th>
                <th className="px-4 py-3 font-medium">เลขท้าย 3 ตัว</th>
                <th className="px-4 py-3 font-medium">เลขท้าย 2 ตัว</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {draws.map((draw) => (
                <tr key={draw.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-muted">
                    <Link href={`/results/${draw.drawDate}`} className="hover:text-gold-light hover:underline">
                      {draw.drawDateThai}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tracking-widest text-gold-light">
                    {draw.firstPrize}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tracking-widest text-foreground">
                    {draw.front3.join("  ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tracking-widest text-foreground">
                    {draw.back3.join("  ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tracking-widest text-foreground">
                    {draw.last2}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <StatsDisclaimer />
      </div>
    </div>
  );
}
