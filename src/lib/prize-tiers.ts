import type { DrawRecord } from "@/lib/lottery-stats";

export type PrizeTierKey =
  | "first"
  | "front3"
  | "back3"
  | "last2"
  | "near1"
  | "second"
  | "third"
  | "fourth"
  | "fifth";

export type PrizeTier = {
  key: PrizeTierKey;
  label: string;
  subtitle: string;
  count: number;
  digitLength: number;
};

// Every prize tier GLO actually draws, in announcement order — mirrors the
// standard "ตรวจหวย" layout every lottery-checking site uses. Used both to
// render the full breakdown (src/components/DrawPrizeBreakdown.tsx) and to
// match a ticket number against every tier (src/components/DrawResultChecker.tsx).
export const PRIZE_TIERS: PrizeTier[] = [
  { key: "first", label: "รางวัลที่ 1", subtitle: "รางวัลละ 6,000,000 บาท", count: 1, digitLength: 6 },
  { key: "front3", label: "เลขหน้า 3 ตัว", subtitle: "2 รางวัลๆละ 4,000 บาท", count: 2, digitLength: 3 },
  { key: "back3", label: "เลขท้าย 3 ตัว", subtitle: "2 รางวัลๆละ 4,000 บาท", count: 2, digitLength: 3 },
  { key: "last2", label: "เลขท้าย 2 ตัว", subtitle: "1 รางวัลๆละ 2,000 บาท", count: 1, digitLength: 2 },
  {
    key: "near1",
    label: "รางวัลข้างเคียงรางวัลที่ 1",
    subtitle: "2 รางวัลๆละ 100,000 บาท",
    count: 2,
    digitLength: 6,
  },
  { key: "second", label: "รางวัลที่ 2", subtitle: "5 รางวัลๆละ 200,000 บาท", count: 5, digitLength: 6 },
  { key: "third", label: "รางวัลที่ 3", subtitle: "10 รางวัลๆละ 80,000 บาท", count: 10, digitLength: 6 },
  { key: "fourth", label: "รางวัลที่ 4", subtitle: "50 รางวัลๆละ 40,000 บาท", count: 50, digitLength: 6 },
  { key: "fifth", label: "รางวัลที่ 5", subtitle: "100 รางวัลๆละ 20,000 บาท", count: 100, digitLength: 6 },
];

export function getTierValues(draw: DrawRecord | null, key: PrizeTierKey): string[] {
  if (!draw) return [];
  switch (key) {
    case "first":
      return [draw.firstPrize];
    case "front3":
      return draw.front3;
    case "back3":
      return draw.back3;
    case "last2":
      return [draw.last2];
    case "near1":
      return draw.near1 ?? [];
    case "second":
      return draw.second ?? [];
    case "third":
      return draw.third ?? [];
    case "fourth":
      return draw.fourth ?? [];
    case "fifth":
      return draw.fifth ?? [];
  }
}

// Whether a full 6-digit ticket number wins this tier. NOT the same as
// `getTierValues(...).includes(ticketNumber)` — front3/back3/last2 store
// shorter values (3 or 2 digits) that only ever match a SLICE of the
// ticket number (front3 = its first 3 digits, back3 = its last 3, last2 =
// its last 2), never the full 6-digit string. Every other tier (first,
// near1, second..fifth) stores full 6-digit numbers and matches exactly.
export function matchesTier(draw: DrawRecord | null, key: PrizeTierKey, ticketNumber: string): boolean {
  if (!draw) return false;
  switch (key) {
    case "first":
      return !!draw.firstPrize && ticketNumber === draw.firstPrize;
    case "front3":
      return draw.front3.includes(ticketNumber.slice(0, 3));
    case "back3":
      return draw.back3.includes(ticketNumber.slice(-3));
    case "last2":
      return !!draw.last2 && ticketNumber.slice(-2) === draw.last2;
    case "near1":
      return (draw.near1 ?? []).includes(ticketNumber);
    case "second":
      return (draw.second ?? []).includes(ticketNumber);
    case "third":
      return (draw.third ?? []).includes(ticketNumber);
    case "fourth":
      return (draw.fourth ?? []).includes(ticketNumber);
    case "fifth":
      return (draw.fifth ?? []).includes(ticketNumber);
  }
}
