// Pure calculation logic over an array of draws — no DB/network access here
// on purpose, so it's easy to reason about, reuse, and (later) test. Draws
// come from src/app/actions/lottery.ts's getAllDrawsLite().

export type DrawRecord = {
  id: string;
  drawDate: string; // ISO date, e.g. "2026-09-01"
  drawDateThai: string;
  firstPrize: string;
  last2: string;
  front3: string[];
  back3: string[];
  // Full prize breakdown (added 2026-09-06) — optional since rows imported
  // before this migration may not have them yet. Never used by the
  // number-lookup stats above (those only ever care about last2/front3/
  // back3); only consumed by the full "ตรวจหวย" breakdown UI.
  near1?: string[]; // รางวัลข้างเคียงรางวัลที่ 1 (2 numbers)
  second?: string[]; // รางวัลที่ 2 (5 numbers)
  third?: string[]; // รางวัลที่ 3 (10 numbers)
  fourth?: string[]; // รางวัลที่ 4 (50 numbers)
  fifth?: string[]; // รางวัลที่ 5 (100 numbers)
};

export type StatCategory = "last2" | "front3" | "back3";

// Whether `digits` appears in this draw's given category. front3/back3 each
// hold two numbers per draw — a match against either counts.
function matchesCategory(draw: DrawRecord, digits: string, category: StatCategory): boolean {
  if (category === "last2") return draw.last2 === digits;
  if (category === "front3") return draw.front3.includes(digits);
  return draw.back3.includes(digits);
}

// Every draw where `digits` showed up in `category`, most recent first.
export function findMatches(
  draws: DrawRecord[],
  digits: string,
  category: StatCategory
): DrawRecord[] {
  return draws
    .filter((d) => matchesCategory(d, digits, category))
    .sort((a, b) => b.drawDate.localeCompare(a.drawDate));
}

export function countOccurrences(
  draws: DrawRecord[],
  digits: string,
  category: StatCategory
): number {
  return findMatches(draws, digits, category).length;
}

// { "2569": 5, "2568": 3, ... } — count per Buddhist-era year, taken from
// the Thai draw-date string's own year token rather than re-deriving it
// from the ISO date, since that's what's actually displayed everywhere else.
export function frequencyByYear(matches: DrawRecord[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const draw of matches) {
    const year = draw.drawDateThai.trim().split(/\s+/).pop() ?? "";
    result[year] = (result[year] ?? 0) + 1;
  }
  return result;
}

export type GapStats = {
  averageDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  drawsSinceLastSeen: number | null;
};

// Days between each consecutive appearance (matches must already be sorted
// most-recent-first, as findMatches returns them) — needs at least 2 hits
// to say anything about "how far apart".
export function gapAnalysis(matches: DrawRecord[], allDrawsSorted: DrawRecord[]): GapStats {
  if (matches.length === 0) {
    return { averageDays: null, minDays: null, maxDays: null, drawsSinceLastSeen: null };
  }

  const gaps: number[] = [];
  for (let i = 0; i < matches.length - 1; i++) {
    const newer = new Date(matches[i].drawDate).getTime();
    const older = new Date(matches[i + 1].drawDate).getTime();
    gaps.push(Math.round((newer - older) / (1000 * 60 * 60 * 24)));
  }

  const lastSeenDate = matches[0].drawDate;
  const drawsSinceLastSeen = allDrawsSorted.findIndex((d) => d.drawDate === lastSeenDate);

  return {
    averageDays: gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
    minDays: gaps.length > 0 ? Math.min(...gaps) : null,
    maxDays: gaps.length > 0 ? Math.max(...gaps) : null,
    drawsSinceLastSeen: drawsSinceLastSeen >= 0 ? drawsSinceLastSeen : null,
  };
}

export type NumberStats = {
  digits: string;
  category: StatCategory;
  categoryLabel: string;
  count: number;
  firstSeen: DrawRecord | null;
  lastSeen: DrawRecord | null;
  gaps: GapStats;
  byYear: Record<string, number>;
  history: DrawRecord[];
};

const CATEGORY_LABELS: Record<StatCategory, string> = {
  last2: "เลขท้าย 2 ตัว",
  front3: "เลขหน้า 3 ตัว",
  back3: "เลขท้าย 3 ตัว",
};

export function buildNumberStats(
  allDraws: DrawRecord[],
  digits: string,
  category: StatCategory
): NumberStats {
  const allDrawsSorted = [...allDraws].sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  const matches = findMatches(allDrawsSorted, digits, category);

  return {
    digits,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    count: matches.length,
    firstSeen: matches.length > 0 ? matches[matches.length - 1] : null,
    lastSeen: matches.length > 0 ? matches[0] : null,
    gaps: gapAnalysis(matches, allDrawsSorted),
    byYear: frequencyByYear(matches),
    history: matches,
  };
}
