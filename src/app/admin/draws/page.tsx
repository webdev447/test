import Link from "next/link";
import { getAdminDraws } from "@/app/actions/lottery";
import DrawsManager from "@/components/admin/DrawsManager";
import { getUpcomingDrawDates, formatThaiDate, UPCOMING_SEO_DRAWS_COUNT } from "@/lib/draw-schedule";

export default async function AdminDrawsPage() {
  const draws = await getAdminDraws();
  const upcomingDates = getUpcomingDrawDates(UPCOMING_SEO_DRAWS_COUNT);

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">ผลสลากย้อนหลัง</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        ทั้งหมด {draws.length.toLocaleString("th-TH")} งวด — เพิ่มงวดใหม่ทุกวันที่ 1/16 ที่นี่
      </p>

      <div className="mt-5 rounded-2xl border border-border bg-background-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          หน้า SEO งวดถัดไปที่เตรียมไว้ล่วงหน้า ({upcomingDates.length} งวด)
        </h2>
        <p className="mt-1 text-xs text-foreground-muted">
          สร้างและอัปเดตให้อัตโนมัติ (ไม่ต้องกดอะไรที่นี่) — คลิกเพื่อเปิดดูหน้าจริงบนเว็บ ก่อนผลออกจะโชว์เป็น
          &quot;รอประกาศผล&quot; พอกดยืนยันงวดนั้นด้านล่างแล้วจะกลายเป็นผลจริงในหน้าเดิมทันที
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingDates.map((date) => (
            <Link
              key={date}
              href={`/results/${date}`}
              target="_blank"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              {formatThaiDate(date)} ↗
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <DrawsManager initialDraws={draws} />
      </div>
    </div>
  );
}
