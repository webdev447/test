import Link from "next/link";
import { getLatestDraw } from "@/app/actions/lottery";
import StatisticsSearchBox from "@/components/StatisticsSearchBox";
import StatsDisclaimer from "@/components/StatsDisclaimer";
import { getUpcomingDrawDates, formatThaiDate } from "@/lib/draw-schedule";

export const metadata = {
  title: "สถิติหวยย้อนหลัง เลขท้าย 2 ตัว 3 ตัว ออกบ่อยแค่ไหน | เจเคลอตเตอรี่",
  description:
    "ค้นหาสถิติเลขท้าย 2 ตัว เลขหน้า-ท้าย 3 ตัวย้อนหลัง เช็กว่าเลขที่สนใจออกบ่อยแค่ไหน ครั้งล่าสุดเมื่อไร พร้อมกราฟความถี่รายปีจากฐานข้อมูลจริง",
};

// Without this, Next.js prerenders the page once at build time and freezes
// it — a newly-confirmed draw, and the "งวดถัดไป" date rolling forward day
// by day, would never show up until the next deploy.
export const revalidate = 300;

export default async function StatisticsPage() {
  const latest = await getLatestDraw();
  const [nextDrawDate] = getUpcomingDrawDates(1);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        สถิติหวยย้อนหลัง เลขท้าย 2 ตัว 3 ตัว
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        ค้นหาเลขที่สนใจ ดูสถิติการออกรางวัลย้อนหลัง เลขท้าย 2 ตัวออกบ่อยแค่ไหน
        เลขหน้า-ท้าย 3 ตัวออกครั้งล่าสุดเมื่อไร จากฐานข้อมูลผลสลากจริง
      </p>

      <div className="mt-6 rounded-2xl border border-gold bg-background-card p-6 shadow-md shadow-blue-950/5">
        <StatisticsSearchBox />
      </div>

      {latest && (
        <div className="mt-6 rounded-2xl border border-border bg-background-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">งวดล่าสุด</h2>
            <Link href="/results" className="text-sm font-medium text-gold-light hover:underline">
              ดูผลย้อนหลังทั้งหมด →
            </Link>
          </div>
          <p className="mt-1 text-xs text-foreground-muted">งวดวันที่ {latest.drawDateThai}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label="รางวัลที่ 1" value={latest.firstPrize} />
            <StatChip label="เลขท้าย 2 ตัว" value={latest.last2} />
            <StatChip label="เลขหน้า 3 ตัว" value={latest.front3.join(" ")} />
            <StatChip label="เลขท้าย 3 ตัว" value={latest.back3.join(" ")} />
          </div>
        </div>
      )}

      {nextDrawDate && (
        <Link
          href={`/results/${nextDrawDate}`}
          className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background-card px-5 py-3.5 text-sm transition-colors hover:border-gold"
        >
          <span className="text-foreground-muted">
            งวดถัดไป: วันที่ {formatThaiDate(nextDrawDate)}
          </span>
          <span className="font-semibold text-gold-light">เตรียมตรวจที่นี่ →</span>
        </Link>
      )}

      <div className="mt-6">
        <StatsDisclaimer />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background-soft px-3 py-2.5 text-center">
      <p className="text-[11px] text-foreground-muted">{label}</p>
      <p className="mt-1 text-sm font-bold tracking-widest text-gold-light">{value}</p>
    </div>
  );
}
