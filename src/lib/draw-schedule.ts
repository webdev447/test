// Thai date formatting + the standard GLO draw schedule (1st and 16th of
// every month). Pure, no DB coupling — used both by the per-draw SEO pages
// (src/app/results/[date]) and the sitemap.

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// How many upcoming (not-yet-announced) draw dates to pre-publish SEO stub
// pages for — used by both src/app/sitemap.ts and the admin preview list at
// /admin/draws. One place to change so the two never drift apart. 8 draws
// = roughly 4 months ahead (2 draws/month); the rolling window always
// tops back up to this count as soon as the nearest draw date passes —
// getUpcomingDrawDates recomputes "next N from right now" fresh every call,
// nothing is pre-generated/stored, so there's no batch to "run out" of.
export const UPCOMING_SEO_DRAWS_COUNT = 8;

// "2026-09-16" -> "16 กันยายน 2569"
export function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Next N upcoming draw dates after `from`, assuming the standard 1st/16th
// schedule. GLO occasionally shifts a draw a day or two around a public
// holiday — that's announced close to the date and isn't predictable this
// far out, so this is only used to pre-publish a "coming soon" SEO page
// ahead of time, never presented as an official confirmed date. Once GLO's
// real date is known, the admin enters the actual result under its real
// date via /admin/draws regardless of what this function guessed.
export function getUpcomingDrawDates(count: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  // Safety cap so a bug here can't spin forever.
  for (let guard = 0; guard < 60 && dates.length < count; guard++) {
    for (const day of [1, 16]) {
      const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (candidate > from) dates.push(toIso(candidate));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return dates.slice(0, count);
}
