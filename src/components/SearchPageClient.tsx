"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllDrawDates, getDrawByDate } from "@/app/actions/lottery";
import type { DrawRecord } from "@/lib/lottery-stats";
import DrawResultChecker from "@/components/DrawResultChecker";
import DrawPrizeBreakdown from "@/components/DrawPrizeBreakdown";

// The interactive part of /search (draw picker + checker + breakdown) —
// split out from the page itself so the page can stay a Server Component
// and export real title/description/OG metadata, which a "use client" page
// can't do in Next.js.
//
// Two-stage fetch on purpose: the date list (getAllDrawDates) is cheap —
// just two short columns per draw — and loads once for the dropdown.
// The full prize breakdown for whichever ONE draw is selected
// (getDrawByDate) is fetched only when the selection changes, instead of
// pulling every prize tier for all 470+ draws up front just to use one at
// a time.
export default function SearchPageClient() {
  const [dates, setDates] = useState<{ drawDate: string; drawDateThai: string }[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draw, setDraw] = useState<DrawRecord | null>(null);

  useEffect(() => {
    getAllDrawDates()
      .then((list) => {
        setDates(list);
        if (list.length > 0) setSelectedDate(list[0].drawDate);
      })
      .catch((err) => console.error("โหลดรายการงวดไม่สำเร็จ:", err))
      .finally(() => setLoadingDates(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    getDrawByDate(selectedDate)
      .then((d) => {
        if (!cancelled) setDraw(d);
      })
      .catch((err) => console.error("โหลดผลสลากไม่สำเร็จ:", err));
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  if (loadingDates) {
    return <p className="mt-8 text-sm text-foreground-muted">กำลังโหลดผลสลาก...</p>;
  }
  if (dates.length === 0) {
    return <p className="mt-8 text-sm text-foreground-muted">ยังไม่มีข้อมูลผลสลากในระบบ</p>;
  }

  return (
    <>
      <label className="mt-8 flex flex-col gap-2 rounded-2xl border border-border bg-background-card p-6 text-sm text-foreground-muted">
        งวดวันที่
        <select
          value={selectedDate ?? ""}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          {dates.map((d) => (
            <option key={d.drawDate} value={d.drawDate}>
              {d.drawDateThai}
            </option>
          ))}
        </select>
      </label>

      <DrawResultChecker draw={draw} />

      {draw && (
        <div className="mt-4">
          <h2 className="text-center text-lg font-semibold text-foreground">
            ผลรางวัลทั้งหมด งวดวันที่ {draw.drawDateThai}
          </h2>
          <DrawPrizeBreakdown draw={draw} />
          <p className="mt-3 text-center text-xs text-foreground-muted">
            อ้างอิงผลรางวัลอย่างเป็นทางการจากสำนักงานสลากกินแบ่งรัฐบาลเสมอ
          </p>
        </div>
      )}

      <Link
        href="/statistics"
        className="mt-8 flex items-center justify-between rounded-2xl border border-gold bg-gold/5 px-5 py-3.5 text-sm transition-colors hover:bg-gold/10"
      >
        <span className="font-medium text-foreground">
          อยากรู้ว่าเลขไหนออกบ่อย? ดูสถิติหวยย้อนหลัง
          {draw && <span className="text-foreground-muted"> (งวดวันที่ {draw.drawDateThai})</span>}
        </span>
        <span className="font-semibold text-gold-light">ดูสถิติ →</span>
      </Link>
    </>
  );
}
