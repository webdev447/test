import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDrawDates, getRecentDrawDates, getDrawByDate, getLatestDraw } from "@/app/actions/lottery";
import StatsDisclaimer from "@/components/StatsDisclaimer";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import DrawResultChecker from "@/components/DrawResultChecker";
import DrawPrizeBreakdown from "@/components/DrawPrizeBreakdown";
import FaqSection from "@/components/FaqSection";
import FaqJsonLd from "@/components/FaqJsonLd";
import { CHECKING_FAQ } from "@/lib/checking-faq";
import { formatThaiDate, getUpcomingDrawDates, UPCOMING_SEO_DRAWS_COUNT } from "@/lib/draw-schedule";
import { getSiteUrl, ogMeta } from "@/lib/site-url";

type Params = { date: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Without this, every visit — including repeat hits on the SAME date from
// different visitors, or a crawler re-checking an upcoming draw's page —
// re-runs the DB queries below from scratch. Caching each date's rendered
// page for up to 5 minutes cuts that to one fetch per date per window,
// which is the main thing that was making this page feel slow.
export const revalidate = 300;

// A dynamic segment gets NO caching at all — every request stays fully
// dynamic — unless it has a generateStaticParams, even one that returns an
// empty list. Pre-rendering every known date (real + the upcoming stubs)
// at build time means the common case (someone hitting an existing draw's
// page) is served instantly from the start, not paying the DB round-trip
// on a cold first visit; any date not in this list (e.g. one added between
// deploys) still renders on demand and gets cached from then on, since
// dynamicParams defaults to true.
export async function generateStaticParams() {
  const [historical, upcoming] = await Promise.all([
    getAllDrawDates(),
    Promise.resolve(getUpcomingDrawDates(UPCOMING_SEO_DRAWS_COUNT)),
  ]);
  const dates = [...historical.map((d) => d.drawDate), ...upcoming];
  return dates.map((date) => ({ date }));
}

// Permalink for one specific draw, keyed by its real calendar date — this
// is the page that gets published DAYS BEFORE the draw happens (as a
// "coming soon" stub, full breakdown shown as placeholders) so Google can
// index the URL in advance, then updates in place with real results the
// moment an admin enters them via /admin/draws. Same URL throughout, same
// heading structure throughout (H1 > H2 sections > H3 per prize tier) —
// only the body text and numbers change from "not yet announced" to real
// values, so nothing about the page's indexed structure has to be redone.
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};

  const thai = formatThaiDate(date);
  const canonical = `${getSiteUrl()}/results/${date}`;
  const draw = await getDrawByDate(date);

  if (draw) {
    const title = `ตรวจหวย งวดวันที่ ${thai} ผลสลากกินแบ่งรัฐบาลย้อนหลัง | เจเคลอตเตอรี่`;
    const description = `ผลสลากกินแบ่งรัฐบาลงวดวันที่ ${thai} รางวัลที่ 1 คือ ${draw.firstPrize} ตรวจรางวัลข้างเคียง เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว และรางวัลที่ 2-5 ครบทุกรางวัลได้ที่นี่`;
    return { title, description, alternates: { canonical }, ...ogMeta(title, description, canonical) };
  }

  const title = `ตรวจหวย งวดประจำวันที่ ${thai} ผลสลากกินแบ่งรัฐบาล | เจเคลอตเตอรี่`;
  const description = `ตรวจหวยงวดวันที่ ${thai} ผลสลากกินแบ่งรัฐบาลประกาศผลเวลาประมาณ 14:30 น. กลับมาดูรางวัลที่ 1 รางวัลข้างเคียง เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว และรางวัลที่ 2-5 ได้ที่หน้านี้ทันทีที่ประกาศ`;
  return { title, description, alternates: { canonical }, ...ogMeta(title, description, canonical) };
}

export default async function DrawByDatePage({ params }: { params: Promise<Params> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const thai = formatThaiDate(date);
  const draw = await getDrawByDate(date);
  const todayIso = new Date().toISOString().slice(0, 10);
  const isUpcoming = !draw && date >= todayIso;
  const latest = draw ? null : await getLatestDraw();

  const recentDraws = await getRecentDrawDates(40);
  const drawOptions = recentDraws.map((d) => ({ value: d.drawDate, label: d.drawDateThai }));
  if (!drawOptions.some((o) => o.value === date)) {
    drawOptions.unshift({ value: date, label: thai });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "หน้าแรก", href: "/" },
          { name: "ผลสลากย้อนหลัง", href: "/results" },
          { name: `งวดวันที่ ${thai}`, href: `/results/${date}` },
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
        <span className="font-semibold text-foreground">งวดวันที่ {thai}</span>
      </nav>

      <div className="mt-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
          🔍 เครื่องมือตรวจหวยฟรี
        </span>
      </div>

      {/* H1 — one per page, stays worded the same across both states (only
          the body content below changes) so the URL keeps one consistent
          primary heading through its "not yet announced" → "announced"
          transition. */}
      <h1 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
        ตรวจหวย งวดประจำวันที่ {thai}
      </h1>

      {draw ? (
        <p className="mt-2 text-center text-sm text-foreground-muted">
          รางวัลที่ 1 คือ <strong className="text-gold-light">{draw.firstPrize}</strong> — ตรวจครบทุกรางวัลด้านล่าง
        </p>
      ) : isUpcoming ? (
        <p className="mt-2 text-center text-sm text-foreground-muted">ประกาศผลประมาณ 14:30 น.</p>
      ) : (
        <p className="mt-2 text-center text-sm leading-relaxed text-foreground">
          ยังไม่มีข้อมูลผลสลากงวดวันที่ {thai} ในระบบ
        </p>
      )}

      {!draw && !isUpcoming && (
        <div className="text-center">
          <Link
            href="/results"
            className="mt-3 inline-block text-sm font-semibold text-gold-light hover:underline"
          >
            ดูผลสลากย้อนหลังทั้งหมด →
          </Link>
        </div>
      )}

      {(draw || isUpcoming) && (
        <>
          <h2 className="mt-4 text-center text-lg font-bold text-foreground">
            {draw ? `ตรวจเลขสลาก งวดวันที่ ${thai}` : `เตรียมตรวจหวย งวดวันที่ ${thai}`}
          </h2>
          <DrawResultChecker draw={draw} drawOptions={drawOptions} selectedDate={date} />

          <DrawPrizeBreakdown draw={draw} />
        </>
      )}

      <h2 className="mt-8 text-center text-lg font-bold text-foreground">สถิติและงวดอื่นๆ</h2>
      <p className="mt-1 text-center text-sm text-foreground-muted">
        อยากรู้ว่าเลขไหนออกบ่อย ดูสถิติการออกของเลขท้าย 2 ตัวและเลขหน้า-ท้าย 3 ตัวย้อนหลังได้ต่อ
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/statistics"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          ดูสถิติเลขย้อนหลัง →
        </Link>
        {isUpcoming && !draw && latest && (
          <Link
            href={`/results/${latest.drawDate}`}
            className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
          >
            ดูผลงวดล่าสุด (งวดวันที่ {latest.drawDateThai}) →
          </Link>
        )}
      </div>

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
