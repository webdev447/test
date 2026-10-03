import Link from "next/link";
import { getRecentDrawDates, getLatestDraw } from "@/app/actions/lottery";
import StatsDisclaimer from "@/components/StatsDisclaimer";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import DrawResultChecker from "@/components/DrawResultChecker";
import DrawPrizeBreakdown from "@/components/DrawPrizeBreakdown";
import FaqSection from "@/components/FaqSection";
import FaqJsonLd from "@/components/FaqJsonLd";
import { CHECKING_FAQ } from "@/lib/checking-faq";
import { getUpcomingDrawDates, formatThaiDate } from "@/lib/draw-schedule";
import { getSiteUrl, ogMeta } from "@/lib/site-url";

// Without this, Next.js prerenders the page once at build time and freezes
// it — a newly-confirmed draw, and the "งวดถัดไป" date rolling forward day
// by day, would never show up until the next deploy.
export const revalidate = 300;

export async function generateMetadata() {
  const draw = await getLatestDraw();
  const url = `${getSiteUrl()}/results/latest`;

  if (!draw) {
    const title = "ตรวจหวยงวดล่าสุด ผลสลากกินแบ่งรัฐบาล | เจเคลอตเตอรี่";
    const description = "ผลสลากกินแบ่งรัฐบาลงวดล่าสุด รางวัลที่ 1 เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว";
    return { title, description, ...ogMeta(title, description, url) };
  }

  const title = `ตรวจหวยงวด ${draw.drawDateThai} ผลสลากกินแบ่งรัฐบาลล่าสุด | เจเคลอตเตอรี่`;
  const description = `ผลสลากกินแบ่งรัฐบาลงวดวันที่ ${draw.drawDateThai} รางวัลที่ 1 คือ ${draw.firstPrize} พร้อมรางวัลข้างเคียง เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว และรางวัลที่ 2-5 ครบทุกรางวัล`;
  return { title, description, ...ogMeta(title, description, url) };
}

export default async function LatestResultPage() {
  const draw = await getLatestDraw();
  const [nextDrawDate] = getUpcomingDrawDates(1);

  const recentDraws = await getRecentDrawDates(40);
  const drawOptions = recentDraws.map((d) => ({ value: d.drawDate, label: d.drawDateThai }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "หน้าแรก", href: "/" },
          { name: "ผลสลากย้อนหลัง", href: "/results" },
          { name: "งวดล่าสุด", href: "/results/latest" },
        ]}
      />

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <Link href="/results" className="hover:text-gold-light">
          ผลสลากย้อนหลัง
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">งวดล่าสุด</span>
      </nav>

      <div className="mt-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
          🔍 เครื่องมือตรวจหวยฟรี
        </span>
      </div>

      <h1 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
        {draw ? `ตรวจหวยงวดล่าสุด งวดวันที่ ${draw.drawDateThai}` : "ตรวจหวยงวดล่าสุด"}
      </h1>

      {!draw ? (
        <p className="mt-2 text-center text-sm text-foreground-muted">ยังไม่มีข้อมูลผลสลากในระบบ</p>
      ) : (
        <>
          <p className="mt-2 text-center text-sm text-foreground-muted">
            รางวัลที่ 1 คือ <strong className="text-gold-light">{draw.firstPrize}</strong> — ตรวจครบทุกรางวัลด้านล่าง
          </p>

          <h2 className="mt-4 text-center text-lg font-bold text-foreground">ตรวจเลขสลากงวดนี้</h2>
          <DrawResultChecker draw={draw} drawOptions={drawOptions} selectedDate={draw.drawDate} />

          <h2 className="mt-8 text-center text-lg font-bold text-foreground">
            ผลรางวัลทั้งหมด งวดวันที่ {draw.drawDateThai}
          </h2>
          <p className="mt-1 text-center text-sm text-foreground-muted">
            รางวัลที่ 1 รางวัลข้างเคียงรางวัลที่ 1 เลขหน้า 3 ตัว เลขท้าย 3 ตัว เลขท้าย 2 ตัว และรางวัลที่ 2
            ถึงรางวัลที่ 5 อ้างอิงผลอย่างเป็นทางการจากสำนักงานสลากกินแบ่งรัฐบาล
          </p>
          <DrawPrizeBreakdown draw={draw} />

          <div className="text-center">
            <Link
              href={`/results/${draw.drawDate}`}
              className="mt-4 inline-block text-sm font-semibold text-gold-light hover:underline"
            >
              ลิงก์ถาวรของงวดนี้ →
            </Link>
          </div>
        </>
      )}

      {nextDrawDate && (
        <>
          <h2 className="mt-8 text-center text-lg font-bold text-foreground">
            เตรียมตรวจหวย งวดวันที่ {formatThaiDate(nextDrawDate)}
          </h2>
          <p className="mt-1 text-center text-sm text-foreground-muted">
            เตรียมตรวจหวยงวดถัดไปล่วงหน้าได้ที่นี่ หน้าจะอัปเดตเป็นผลจริงทันทีที่ประกาศ
          </p>
          <Link
            href={`/results/${nextDrawDate}`}
            className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-background-card px-5 py-3.5 text-sm transition-colors hover:border-gold"
          >
            <span className="text-foreground-muted">
              งวดวันที่ {formatThaiDate(nextDrawDate)}
            </span>
            <span className="font-semibold text-gold-light">เตรียมตรวจที่นี่ →</span>
          </Link>
        </>
      )}

      <FaqJsonLd items={CHECKING_FAQ} />
      <div className="mt-10">
        <h2 className="text-center text-lg font-bold text-foreground">คำถามที่พบบ่อย</h2>
        <FaqSection items={CHECKING_FAQ} />
      </div>

      <div className="mt-6">
        <StatsDisclaimer />
      </div>
    </div>
  );
}
