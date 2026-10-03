import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchLatestFromGLOApi } from "@/lib/glo-api";

// Scheduled auto-fetch (see vercel.json — fires shortly after each draw's
// ~14:30 announcement on the 1st/16th). Protected by CRON_SECRET: Vercel
// automatically sends it as `Authorization: Bearer <CRON_SECRET>` when it
// invokes a cron job (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs),
// so this rejects anyone else. If deployed somewhere other than Vercel,
// point any external scheduler (e.g. cron-job.org) at this URL with that
// same header instead.
//
// Inserts/updates as status: 'pending', never 'confirmed' — an admin still
// has to open /admin/draws and click "ยืนยันและเผยแพร่" (or edit first)
// before it becomes publicly visible. That's the one confirm click this
// was built to keep, on purpose: a bad/garbled API response never goes
// live unread.
//
// The real draw reveals prizes gradually over the afternoon (5th prize
// first, first prize + near-first numbers last), so a row already sitting
// here as 'pending' gets MERGED into — only filling in fields still empty,
// never overwriting ones already captured — rather than being skipped
// outright. A 'confirmed' row (an admin already reviewed and published it)
// is left alone; further updates for that date go through the admin UI.
//
// Idempotent by design either way: calling this before the day's draw
// exists at all just inserts a fresh 'pending' row; calling it again later
// (or if Vercel's cron delivery double-invokes it) safely tops up the same
// row with anything new.
export const dynamic = "force-dynamic";

type ExistingRow = {
  id: string;
  status: string;
  first_prize: string;
  last2: string;
  front3: string[];
  back3: string[];
  near1: string[] | null;
  second: string[] | null;
  third: string[] | null;
  fourth: string[] | null;
  fifth: string[] | null;
};

function fillIfEmpty(existing: string, fresh: string): string {
  return existing || fresh;
}

function fillPairIfEmpty(existing: string[], fresh: [string, string]): string[] {
  const hasExisting = existing.length === 2 && existing.every((v) => v);
  if (hasExisting) return existing;
  const hasFresh = fresh.every((v) => v);
  return hasFresh ? fresh : existing;
}

function fillListIfEmpty(existing: string[] | null, fresh: string[] | undefined): string[] | null {
  if (existing?.length) return existing;
  return fresh?.length ? fresh : existing;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const input = await fetchLatestFromGLOApi();
    const db = supabaseAdmin();

    const { data: existing, error: existingError } = await db
      .from("lottery_draws")
      .select("id, status, first_prize, last2, front3, back3, near1, second, third, fourth, fifth")
      .eq("draw_date", input.drawDate)
      .maybeSingle<ExistingRow>();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.status !== "pending") {
        // Already reviewed and published by an admin — don't silently
        // change a confirmed row; further edits go through /admin/draws.
        return NextResponse.json({ skipped: true, reason: "already confirmed" });
      }

      const merged = {
        first_prize: fillIfEmpty(existing.first_prize, input.firstPrize),
        last2: fillIfEmpty(existing.last2, input.last2),
        front3: fillPairIfEmpty(existing.front3, input.front3),
        back3: fillPairIfEmpty(existing.back3, input.back3),
        near1: fillListIfEmpty(existing.near1, input.near1),
        second: fillListIfEmpty(existing.second, input.second),
        third: fillListIfEmpty(existing.third, input.third),
        fourth: fillListIfEmpty(existing.fourth, input.fourth),
        fifth: fillListIfEmpty(existing.fifth, input.fifth),
      };

      const { error } = await db.from("lottery_draws").update(merged).eq("id", existing.id);
      if (error) throw error;

      return NextResponse.json({ ok: true, drawDate: input.drawDate, status: "pending", merged: true });
    }

    const { error } = await db.from("lottery_draws").insert({
      draw_date: input.drawDate,
      draw_date_thai: input.drawDateThai,
      first_prize: input.firstPrize,
      last2: input.last2,
      front3: input.front3,
      back3: input.back3,
      near1: input.near1?.length ? input.near1 : null,
      second: input.second?.length ? input.second : null,
      third: input.third?.length ? input.third : null,
      fourth: input.fourth?.length ? input.fourth : null,
      fifth: input.fifth?.length ? input.fifth : null,
      source: "auto",
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ skipped: true, reason: "duplicate (race)" });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, drawDate: input.drawDate, status: "pending", merged: false });
  } catch (err) {
    console.error("cron fetch-draw failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
