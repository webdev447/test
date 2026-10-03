"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DrawRecord } from "@/lib/lottery-stats";
import { PRIZE_TIERS, matchesTier } from "@/lib/prize-tiers";
import DigitCodeInput from "@/components/DigitCodeInput";
import CheckResultPopup from "@/components/CheckResultPopup";

export type DrawOption = { value: string; label: string };

const ANNOUNCE_HOUR = 14;
const ANNOUNCE_MINUTE = 30;

type Countdown = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

// Live countdown to the ~14:30 announcement for `targetDate`. Returns null
// before the component has mounted (or when there's no date to count down
// to) so the very first client render still matches the server-rendered
// markup exactly — same "defer the first tick" trick used elsewhere, just
// ticking every second here since seconds are shown.
function useAnnouncementCountdown(targetDate: string | undefined): Countdown | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    function tick() {
      setNow(Date.now());
    }
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [targetDate]);

  if (!targetDate || now === null) return null;

  const target = new Date(
    `${targetDate}T${String(ANNOUNCE_HOUR).padStart(2, "0")}:${String(ANNOUNCE_MINUTE).padStart(2, "0")}:00`
  ).getTime();
  const msLeft = target - now;
  if (msLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };

  return {
    days: Math.floor(msLeft / 86_400_000),
    hours: Math.floor((msLeft % 86_400_000) / 3_600_000),
    minutes: Math.floor((msLeft % 3_600_000) / 60_000),
    seconds: Math.floor((msLeft % 60_000) / 1000),
    done: false,
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-background-card px-2.5 py-1.5 shadow-sm">
      <span className="text-lg font-bold tabular-nums text-foreground">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] text-foreground-muted">{label}</span>
    </div>
  );
}

// The "กรอกเลขสลาก / ตรวจผลรางวัล" widget for one specific, already-known
// draw — checks a 6-digit ticket number against every prize tier (not just
// the four headline categories that /search's general checker covers).
// `drawOptions` (optional) adds a date-switcher dropdown next to the button
// so a visitor can jump to a nearby draw without leaving this widget —
// selecting one navigates to /results/[date] for that date.
export default function DrawResultChecker({
  draw,
  drawOptions,
  selectedDate,
}: {
  draw: DrawRecord | null;
  drawOptions?: DrawOption[];
  selectedDate?: string;
}) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [checked, setChecked] = useState(false);
  const countdown = useAnnouncementCountdown(draw ? undefined : selectedDate);

  const results =
    draw && number.length === 6
      ? PRIZE_TIERS.map((tier) => ({
          label: tier.label,
          subtitle: tier.subtitle,
          matched: matchesTier(draw, tier.key, number),
        }))
      : [];
  const anyMatch = results.some((r) => r.matched);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecked(true);
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="mt-6 overflow-hidden rounded-2xl border border-border bg-background-card shadow-lg shadow-blue-950/10"
    >
      <label className="block bg-foreground py-3 text-center text-base font-bold text-background">
        🎫 กรอกเลขสลาก
      </label>

      <div className="p-5 sm:p-6">
        <DigitCodeInput
          length={6}
          value={number}
          onChange={(next) => {
            setNumber(next);
            setChecked(false);
          }}
        />

        <div className="mt-4 flex gap-2">
        {drawOptions && drawOptions.length > 0 && (
          <div className="relative w-[42%] shrink-0">
            <select
              value={selectedDate}
              onChange={(e) => router.push(`/results/${e.target.value}`)}
              aria-label="เลือกงวดวันที่"
              className="w-full appearance-none truncate rounded-full border border-border bg-background-card py-3 pl-4 pr-8 text-xs font-medium text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {drawOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        )}
        <button
          type="submit"
          disabled={!draw || number.length !== 6}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-4 py-3 text-sm font-bold text-white shadow-md shadow-success/30 transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          ตรวจผลรางวัล
        </button>
      </div>

      {!draw && (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-background-soft p-3.5 text-center">
          {!countdown ? (
            <p className="flex items-center justify-center gap-2 text-sm text-foreground-muted">
              <span className="text-base">🔒</span>
              ยังตรวจไม่ได้ในตอนนี้ — เปิดให้ตรวจทันทีที่ผลประกาศ
            </p>
          ) : countdown.done ? (
            <p className="text-sm font-semibold text-foreground">🔔 กำลังประกาศผล รอสักครู่...</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-gold-light">ผลรางวัลครบทุกรางวัลจะอัปเดตอีก</p>
              <div className="mt-2 flex justify-center gap-2">
                <CountdownUnit value={countdown.days} label="วัน" />
                <CountdownUnit value={countdown.hours} label="ชม." />
                <CountdownUnit value={countdown.minutes} label="นาที" />
                <CountdownUnit value={countdown.seconds} label="วินาที" />
              </div>
            </>
          )}
        </div>
      )}

      </div>
    </form>

    <CheckResultPopup
      open={checked && !!draw && number.length === 6}
      won={anyMatch}
      matches={results.filter((r) => r.matched)}
      onClose={() => setChecked(false)}
    />
    </>
  );
}
