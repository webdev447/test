"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminUserId } from "@/lib/admin-auth";
import { validateDrawInput, fetchLatestFromGLOApi, type DrawInput } from "@/lib/glo-api";
import {
  buildNumberStats,
  type DrawRecord,
  type NumberStats,
  type StatCategory,
} from "@/lib/lottery-stats";

export type { DrawInput };

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!isAdminUserId(userId)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงส่วนนี้");
  }
  return userId as string;
}

const DRAW_COLUMNS =
  "id, draw_date, draw_date_thai, first_prize, last2, front3, back3, near1, second, third, fourth, fifth";

function mapRow(row: {
  id: string;
  draw_date: string;
  draw_date_thai: string;
  first_prize: string;
  last2: string;
  front3: string[];
  back3: string[];
  near1?: string[] | null;
  second?: string[] | null;
  third?: string[] | null;
  fourth?: string[] | null;
  fifth?: string[] | null;
}): DrawRecord {
  return {
    id: row.id,
    drawDate: row.draw_date,
    drawDateThai: row.draw_date_thai,
    firstPrize: row.first_prize,
    last2: row.last2,
    front3: row.front3,
    back3: row.back3,
    near1: row.near1 ?? undefined,
    second: row.second ?? undefined,
    third: row.third ?? undefined,
    fourth: row.fourth ?? undefined,
    fifth: row.fifth ?? undefined,
  };
}

// Lightweight — only draw_date/draw_date_thai for the last N confirmed
// draws, used to populate the date-switcher dropdown on the checker widget
// (src/components/DrawResultChecker.tsx). Deliberately not the full row:
// every prize tier (including the 100-number fifth-prize array) for all
// 470+ draws just to throw away everything but two short strings would be
// a real perf cost on a page that's otherwise cheap to render.
export async function getRecentDrawDates(
  limit: number
): Promise<{ drawDate: string; drawDateThai: string }[]> {
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select("draw_date, draw_date_thai")
    .eq("status", "confirmed")
    .order("draw_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({ drawDate: row.draw_date, drawDateThai: row.draw_date_thai }));
}

// Same idea, no limit — /search needs every historical date (not just
// recent ones) for its "browse any draw" dropdown, but still only the two
// short columns, not each draw's full prize breakdown.
export async function getAllDrawDates(): Promise<{ drawDate: string; drawDateThai: string }[]> {
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select("draw_date, draw_date_thai")
    .eq("status", "confirmed")
    .order("draw_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ drawDate: row.draw_date, drawDateThai: row.draw_date_thai }));
}

export async function getLatestDraw(): Promise<DrawRecord | null> {
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select(DRAW_COLUMNS)
    .eq("status", "confirmed")
    .order("draw_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

// Public read — one specific draw by its ISO date, for the per-draw SEO
// permalink at /results/[date]. Returns null both when the date has no
// draw yet (upcoming/not-yet-announced, or only a 'pending' unconfirmed
// row) and when it's a past date with no data — the page itself decides
// which case it is by comparing to today.
export async function getDrawByDate(date: string): Promise<DrawRecord | null> {
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select(DRAW_COLUMNS)
    .eq("draw_date", date)
    .eq("status", "confirmed")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

// Column subset buildNumberStats/matchesCategory actually touch (see
// src/lib/lottery-stats.ts) — front3/back3/last2 to match, drawDate/
// drawDateThai for the year/gap breakdown, firstPrize only for display in
// the history table. Skips near1/second/third/fourth/fifth entirely
// (167 array elements per row, unused here) for every one of 470+ draws.
// Also what /results (the full history table) needs — same columns, same
// reasoning — so it's exported rather than kept private to getNumberPageStats.
const STATS_COLUMNS = "id, draw_date, draw_date_thai, first_prize, last2, front3, back3";

export async function getAllDrawsLite(): Promise<DrawRecord[]> {
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select(STATS_COLUMNS)
    .eq("status", "confirmed")
    .order("draw_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export type NumberPageStatsResult =
  | { ok: true; digits: string; blocks: NumberStats[] }
  | { ok: false; reason: string };

// Validates 2 or 3 digits — kept as a plain string throughout (never run
// through Number()) so a leading zero like "01" or "007" survives intact.
// A 2-digit number only has one real category (เลขท้าย 2 ตัว). A 3-digit
// number exists in two separate categories (เลขหน้า 3 ตัว / เลขท้าย 3 ตัว) —
// both are returned as separate blocks, never merged into one combined
// count, per the "don't mix categories" requirement.
export async function getNumberPageStats(input: string): Promise<NumberPageStatsResult> {
  const digits = input.trim();
  if (!/^\d{2,3}$/.test(digits)) {
    return { ok: false, reason: "กรุณากรอกเลข 2 หรือ 3 หลักเท่านั้น" };
  }

  const allDraws = await getAllDrawsLite();

  if (digits.length === 2) {
    return { ok: true, digits, blocks: [buildNumberStats(allDraws, digits, "last2")] };
  }

  const categories: StatCategory[] = ["front3", "back3"];
  return {
    ok: true,
    digits,
    blocks: categories.map((category) => buildNumberStats(allDraws, digits, category)),
  };
}

// ===== Admin: manage draws (src/app/admin/draws) =====

export type AdminDraw = DrawRecord & { source: string; createdAt: string; status: string };

export async function getAdminDraws(): Promise<AdminDraw[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin()
    .from("lottery_draws")
    .select(`${DRAW_COLUMNS}, source, created_at, status`)
    .order("draw_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...mapRow(row),
    source: row.source,
    createdAt: row.created_at,
    status: row.status,
  }));
}

export async function createDraw(input: DrawInput) {
  await requireAdmin();
  validateDrawInput(input);

  const { data: existing, error: existingError } = await supabaseAdmin()
    .from("lottery_draws")
    .select("id")
    .eq("draw_date", input.drawDate)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error("มีข้อมูลงวดวันที่นี้อยู่แล้ว");

  // Typing it in (or reviewing a GLO auto-fill) and hitting save IS the
  // review step, so this is confirmed immediately — never 'pending'.
  const { error } = await supabaseAdmin().from("lottery_draws").insert({
    draw_date: input.drawDate,
    draw_date_thai: input.drawDateThai.trim(),
    first_prize: input.firstPrize,
    last2: input.last2,
    front3: input.front3,
    back3: input.back3,
    near1: input.near1?.length ? input.near1 : null,
    second: input.second?.length ? input.second : null,
    third: input.third?.length ? input.third : null,
    fourth: input.fourth?.length ? input.fourth : null,
    fifth: input.fifth?.length ? input.fifth : null,
    source: "manual",
    status: "confirmed",
  });
  if (error) {
    if (error.code === "23505") throw new Error("มีข้อมูลงวดวันที่นี้อยู่แล้ว");
    throw error;
  }
}

export async function updateDraw(id: string, input: DrawInput) {
  await requireAdmin();
  validateDrawInput(input);

  // Same reasoning as createDraw — submitting this form (even to edit a
  // still-'pending' auto-fetched row) counts as the human review, so it
  // always comes out 'confirmed'.
  const { error } = await supabaseAdmin()
    .from("lottery_draws")
    .update({
      draw_date: input.drawDate,
      draw_date_thai: input.drawDateThai.trim(),
      first_prize: input.firstPrize,
      last2: input.last2,
      front3: input.front3,
      back3: input.back3,
      near1: input.near1?.length ? input.near1 : null,
      second: input.second?.length ? input.second : null,
      third: input.third?.length ? input.third : null,
      fourth: input.fourth?.length ? input.fourth : null,
      fifth: input.fifth?.length ? input.fifth : null,
      status: "confirmed",
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("มีข้อมูลงวดวันที่นี้อยู่แล้ว");
    throw error;
  }
}

// One-click confirm for a row the scheduled cron already fetched+inserted
// as 'pending' — the data was already validated at insert time, so this
// just flips it visible. If the admin wants to correct something first,
// they use "แก้ไข" (updateDraw) instead, which also confirms.
export async function confirmDraw(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from("lottery_draws")
    .update({ status: "confirmed" })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDraw(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin().from("lottery_draws").delete().eq("id", id);
  if (error) throw error;
}

// Pulls the most recently announced draw straight from the official GLO
// API and returns it pre-filled as a DrawInput — the admin still reviews
// and clicks save (createDraw/updateDraw) themselves, this only removes
// the manual typing. See src/lib/glo-api.ts for the fetch/parse itself
// (shared with the scheduled cron auto-fetch at src/app/api/cron/fetch-draw,
// which calls the same function but saves as 'pending' instead of prompting
// a human first).
export async function fetchLatestDrawFromGLO(): Promise<DrawInput> {
  await requireAdmin();
  return fetchLatestFromGLOApi();
}
