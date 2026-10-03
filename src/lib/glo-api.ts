// Fetches + parses the official GLO ("สำนักงานสลากกินแบ่งรัฐบาล") latest-draw
// API. No admin check here on purpose — callers decide who's allowed to
// call it: the admin-gated Server Action in src/app/actions/lottery.ts (the
// manual "ดึงข้อมูลงวดล่าสุดจาก กสอ." button), or the secret-protected cron
// route at src/app/api/cron/fetch-draw (the scheduled auto-fetch).
import { formatThaiDate } from "@/lib/draw-schedule";

export type DrawInput = {
  drawDate: string; // "YYYY-MM-DD"
  drawDateThai: string;
  firstPrize: string;
  last2: string;
  front3: [string, string];
  back3: [string, string];
  // Full prize breakdown — optional. Manual entry can leave these out (the
  // page just shows placeholders for those tiers until filled in later);
  // the GLO fetch (manual or scheduled) always includes them.
  near1?: string[]; // รางวัลข้างเคียงรางวัลที่ 1 (2 numbers)
  second?: string[]; // รางวัลที่ 2 (5 numbers)
  third?: string[]; // รางวัลที่ 3 (10 numbers)
  fourth?: string[]; // รางวัลที่ 4 (50 numbers)
  fifth?: string[]; // รางวัลที่ 5 (100 numbers)
};

const OPTIONAL_TIERS: { key: keyof DrawInput; label: string; count: number }[] = [
  { key: "near1", label: "รางวัลข้างเคียงรางวัลที่ 1", count: 2 },
  { key: "second", label: "รางวัลที่ 2", count: 5 },
  { key: "third", label: "รางวัลที่ 3", count: 10 },
  { key: "fourth", label: "รางวัลที่ 4", count: 50 },
  { key: "fifth", label: "รางวัลที่ 5", count: 100 },
];

// The real draw reveals prize tiers one at a time over the course of the
// afternoon (5th prize, 4th, 3rd... first prize and the near-first numbers
// come out last) — GLO's API may only have some tiers filled in yet at any
// given moment. So every prize field here is "fill it in if you have it":
// an empty value just means "not drawn yet" and is left as a placeholder
// on the page, never blocks saving whatever IS known so far. What's still
// enforced is FORMAT — if a value is provided, it must be the right shape —
// and front3/back3 must be both-filled-or-both-blank, since GLO always
// reveals that pair together in the same round.
function validatePairTier(pair: [string, string], label: string, digitLength: number) {
  const filled = pair.filter((n) => n !== "");
  if (filled.length === 0) return; // not drawn yet — ok
  const pattern = new RegExp(`^\\d{${digitLength}}$`);
  if (filled.length !== 2 || pair.some((n) => !pattern.test(n))) {
    throw new Error(`${label}ต้องมี ${digitLength} หลักทั้งคู่ หรือเว้นว่างไว้ทั้งคู่ถ้ายังไม่ออก`);
  }
}

export function validateDrawInput(input: DrawInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.drawDate)) {
    throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
  }
  if (!input.drawDateThai.trim()) throw new Error("กรุณาระบุวันที่แบบไทย");

  if (input.firstPrize && !/^\d{6}$/.test(input.firstPrize)) {
    throw new Error("รางวัลที่ 1 ต้องมี 6 หลัก");
  }
  if (input.last2 && !/^\d{2}$/.test(input.last2)) {
    throw new Error("เลขท้าย 2 ตัวต้องมี 2 หลัก");
  }
  validatePairTier(input.front3, "เลขหน้า 3 ตัว", 3);
  validatePairTier(input.back3, "เลขท้าย 3 ตัว", 3);

  for (const tier of OPTIONAL_TIERS) {
    const values = input[tier.key] as string[] | undefined;
    if (!values || values.length === 0) continue; // ok to leave blank
    if (values.length !== tier.count || values.some((n) => !/^\d{6}$/.test(n))) {
      throw new Error(`${tier.label}ต้องมี ${tier.count} เลข เลขละ 6 หลัก`);
    }
  }
}

type GloPrizeGroup = { number?: { round: number; value: string }[] };
type GloResponse = {
  status?: boolean;
  response?: {
    date?: string;
    data?: {
      first?: GloPrizeGroup;
      last2?: GloPrizeGroup;
      last3f?: GloPrizeGroup;
      last3b?: GloPrizeGroup;
      near1?: GloPrizeGroup;
      second?: GloPrizeGroup;
      third?: GloPrizeGroup;
      fourth?: GloPrizeGroup;
      fifth?: GloPrizeGroup;
    };
  };
};

function sortedValues(group: GloPrizeGroup | undefined): string[] {
  return (group?.number ?? [])
    .slice()
    .sort((a, b) => a.round - b.round)
    .map((n) => n.value);
}

// Can only ever return an ALREADY-drawn result — there's no way to know a
// lottery outcome before it happens — so this only makes sense to call
// on/after each draw day (after the ~14:30 announcement).
export async function fetchLatestFromGLOApi(): Promise<DrawInput> {
  const res = await fetch("https://www.glo.or.th/api/lottery/getLatestLottery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("ดึงข้อมูลจากสำนักงานสลากกินแบ่งรัฐบาลไม่สำเร็จ ลองใหม่อีกครั้ง");
  }

  const json: GloResponse = await res.json();
  const drawDate = json.response?.date;
  const data = json.response?.data;
  if (!json.status || !drawDate || !data) {
    throw new Error("รูปแบบข้อมูลจาก กสอ. ไม่ตรงตามที่คาดไว้ กรุณากรอกด้วยตนเอง");
  }

  const front3 = sortedValues(data.last3f);
  const back3 = sortedValues(data.last3b);

  const input: DrawInput = {
    drawDate,
    drawDateThai: formatThaiDate(drawDate),
    firstPrize: data.first?.number?.[0]?.value ?? "",
    last2: data.last2?.number?.[0]?.value ?? "",
    front3: [front3[0] ?? "", front3[1] ?? ""],
    back3: [back3[0] ?? "", back3[1] ?? ""],
    near1: sortedValues(data.near1),
    second: sortedValues(data.second),
    third: sortedValues(data.third),
    fourth: sortedValues(data.fourth),
    fifth: sortedValues(data.fifth),
  };

  validateDrawInput(input);
  return input;
}
