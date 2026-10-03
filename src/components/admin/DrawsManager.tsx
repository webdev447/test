"use client";

import { useState } from "react";
import {
  confirmDraw,
  createDraw,
  deleteDraw,
  fetchLatestDrawFromGLO,
  getAdminDraws,
  updateDraw,
  type AdminDraw,
  type DrawInput,
} from "@/app/actions/lottery";

const EMPTY_FORM: DrawInput = {
  drawDate: "",
  drawDateThai: "",
  firstPrize: "",
  last2: "",
  front3: ["", ""],
  back3: ["", ""],
};

// The real draw reveals prizes gradually over the afternoon, so re-fetching
// from GLO partway through should only ever ADD newly-available numbers,
// never blank out ones already sitting in the form from an earlier fetch.
function mergeDrawInput(prev: DrawInput, fetched: DrawInput): DrawInput {
  return {
    drawDate: fetched.drawDate || prev.drawDate,
    drawDateThai: fetched.drawDateThai || prev.drawDateThai,
    firstPrize: fetched.firstPrize || prev.firstPrize,
    last2: fetched.last2 || prev.last2,
    front3: [fetched.front3[0] || prev.front3[0], fetched.front3[1] || prev.front3[1]],
    back3: [fetched.back3[0] || prev.back3[0], fetched.back3[1] || prev.back3[1]],
    near1: fetched.near1?.length ? fetched.near1 : prev.near1,
    second: fetched.second?.length ? fetched.second : prev.second,
    third: fetched.third?.length ? fetched.third : prev.third,
    fourth: fetched.fourth?.length ? fetched.fourth : prev.fourth,
    fifth: fetched.fifth?.length ? fetched.fifth : prev.fifth,
  };
}

function tierPreview(values: string[]): string {
  return values.length > 0 && values.every((v) => v) ? values.join(" ") : "ยังไม่ออก";
}

const PAGE_SIZE = 20;

export default function DrawsManager({ initialDraws }: { initialDraws: AdminDraw[] }) {
  const [draws, setDraws] = useState(initialDraws);
  const [form, setForm] = useState<DrawInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function refresh() {
    const data = await getAdminDraws();
    setDraws(data);
  }

  function startEdit(draw: AdminDraw) {
    setEditingId(draw.id);
    setForm({
      drawDate: draw.drawDate,
      drawDateThai: draw.drawDateThai,
      firstPrize: draw.firstPrize,
      last2: draw.last2,
      front3: [draw.front3[0] ?? "", draw.front3[1] ?? ""],
      back3: [draw.back3[0] ?? "", draw.back3[1] ?? ""],
      // Carried through as-is (not shown/editable here) so re-saving an
      // edited draw doesn't silently wipe out its already-loaded near1/
      // 2nd–5th prize tiers.
      near1: draw.near1,
      second: draw.second,
      third: draw.third,
      fourth: draw.fourth,
      fifth: draw.fifth,
    });
    setError(null);
    setFetchNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFetchNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await updateDraw(editingId, form);
      } else {
        await createDraw(form);
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFetchFromGLO() {
    setError(null);
    setFetchNotice(null);
    setIsFetching(true);
    try {
      const fetched = await fetchLatestDrawFromGLO();
      if (editingId && form.drawDate && fetched.drawDate !== form.drawDate) {
        throw new Error(
          `ข้อมูลล่าสุดจาก กสอ. เป็นงวดวันที่ ${fetched.drawDateThai} ไม่ตรงกับงวดที่กำลังแก้ไข (${form.drawDateThai}) จึงไม่นำมารวมให้`
        );
      }
      setForm((prev) => mergeDrawInput(prev, fetched));
      setFetchNotice(
        `ดึงข้อมูลงวดวันที่ ${fetched.drawDateThai} มาเติมให้แล้ว (รวมกับข้อมูลที่มีอยู่เดิม ไม่ทับของเก่า) ตรวจสอบตัวเลขให้ตรงกับประกาศจริงก่อนกดบันทึก — ถ้ายังออกไม่ครบทุกรางวัลก็กดดึงซ้ำได้เรื่อยๆ`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }

  async function handleDelete(draw: AdminDraw) {
    if (!window.confirm(`ลบข้อมูลงวดวันที่ ${draw.drawDateThai} ใช่ไหม?`)) return;
    await deleteDraw(draw.id);
    await refresh();
  }

  async function handleConfirm(draw: AdminDraw) {
    await confirmDraw(draw.id);
    await refresh();
  }

  const pendingDraws = draws.filter((d) => d.status === "pending");
  const confirmedDraws = draws.filter((d) => d.status !== "pending");

  const totalPages = Math.max(1, Math.ceil(confirmedDraws.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDraws = confirmedDraws.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-background-card p-5 shadow-sm shadow-blue-950/5 sm:grid-cols-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">
            {editingId ? "แก้ไขงวด" : "เพิ่มงวดใหม่"}
          </h2>
          <button
            type="button"
            onClick={handleFetchFromGLO}
            disabled={isFetching}
            className="rounded-full border border-gold px-4 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลงวดล่าสุดจาก กสอ."}
          </button>
        </div>
        {fetchNotice && (
          <p className="text-xs text-foreground-muted sm:col-span-2">{fetchNotice}</p>
        )}

        <div>
          <label className="text-xs font-medium text-foreground-muted">วันที่ (ปฏิทิน)</label>
          <input
            type="date"
            value={form.drawDate}
            onChange={(e) => setForm({ ...form, drawDate: e.target.value })}
            required
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">วันที่ (แบบไทย)</label>
          <input
            value={form.drawDateThai}
            onChange={(e) => setForm({ ...form, drawDateThai: e.target.value })}
            required
            placeholder="เช่น 16 กันยายน 2569"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">
            รางวัลที่ 1 (6 หลัก, เว้นว่างได้ถ้ายังไม่ออก)
          </label>
          <input
            value={form.firstPrize}
            onChange={(e) =>
              setForm({ ...form, firstPrize: e.target.value.replace(/\D/g, "").slice(0, 6) })
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">
            เลขท้าย 2 ตัว (เว้นว่างได้ถ้ายังไม่ออก)
          </label>
          <input
            value={form.last2}
            onChange={(e) => setForm({ ...form, last2: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">
            เลขหน้า 3 ตัว (2 ชุด, เว้นว่างได้ถ้ายังไม่ออก)
          </label>
          <div className="mt-1 flex gap-2">
            {[0, 1].map((i) => (
              <input
                key={i}
                value={form.front3[i]}
                onChange={(e) => {
                  const next = [...form.front3] as [string, string];
                  next[i] = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setForm({ ...form, front3: next });
                }}
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-muted">
            เลขท้าย 3 ตัว (2 ชุด, เว้นว่างได้ถ้ายังไม่ออก)
          </label>
          <div className="mt-1 flex gap-2">
            {[0, 1].map((i) => (
              <input
                key={i}
                value={form.back3[i]}
                onChange={(e) => {
                  const next = [...form.back3] as [string, string];
                  next[i] = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setForm({ ...form, back3: next });
                }}
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-gold flex-1 rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "+ เพิ่มงวดนี้"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {pendingDraws.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-gold bg-gold/5 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            ⏳ งวดรอยืนยัน ({pendingDraws.length}) — ดึงมาจาก กสอ. อัตโนมัติ ยังไม่แสดงบนเว็บจนกว่าจะกดยืนยัน
          </h2>
          {pendingDraws.map((draw) => (
            <div
              key={draw.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-background-card p-3 text-sm"
            >
              <span className="text-foreground-muted">{draw.drawDateThai}</span>
              <span className="font-bold tracking-widest text-gold-light">
                {draw.firstPrize || "ยังไม่ออก"}
              </span>
              <span className="text-foreground-muted">หน้า {tierPreview(draw.front3)}</span>
              <span className="text-foreground-muted">ท้าย {tierPreview(draw.back3)}</span>
              <span className="text-foreground-muted">2 ตัว {draw.last2 || "ยังไม่ออก"}</span>

              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(draw)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
                >
                  แก้ไขก่อน
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm(draw)}
                  className="btn-gold rounded-full px-4 py-1 text-xs font-semibold text-background"
                >
                  ✓ ยืนยันและเผยแพร่
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(draw)}
                  className="rounded-full border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  ลบ
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {pageDraws.map((draw) => (
          <div
            key={draw.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background-card p-3 text-sm"
          >
            <span className="text-foreground-muted">{draw.drawDateThai}</span>
            <span className="font-bold tracking-widest text-gold-light">
              {draw.firstPrize || "ยังไม่ออก"}
            </span>
            <span className="text-foreground-muted">หน้า {tierPreview(draw.front3)}</span>
            <span className="text-foreground-muted">ท้าย {tierPreview(draw.back3)}</span>
            <span className="text-foreground-muted">2 ตัว {draw.last2 || "ยังไม่ออก"}</span>
            <span className="rounded-full bg-background-soft px-2 py-0.5 text-[11px] text-foreground-muted">
              {draw.source === "import" ? "นำเข้า" : draw.source === "auto" ? "ดึงอัตโนมัติ" : "กรอกเอง"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                draw.fifth?.length
                  ? "bg-success/10 text-success"
                  : "bg-background-soft text-foreground-muted"
              }`}
            >
              {draw.fifth?.length ? "รางวัลครบทุกระดับ" : "ยังไม่มีรางวัลที่ 2-5"}
            </span>

            <span className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(draw)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => handleDelete(draw)}
                className="rounded-full border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
              >
                ลบ
              </button>
            </span>
          </div>
        ))}

        {confirmedDraws.length === 0 && pendingDraws.length === 0 && (
          <p className="text-sm text-foreground-muted">ยังไม่มีข้อมูลผลสลาก เพิ่มงวดแรกด้านบนได้เลย</p>
        )}

        {confirmedDraws.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
            <span className="text-xs text-foreground-muted">
              งวดที่ {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, confirmedDraws.length)} จากทั้งหมด{" "}
              {confirmedDraws.length.toLocaleString("th-TH")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <select
                value={currentPage}
                onChange={(e) => setPage(Number(e.target.value))}
                aria-label="ไปหน้า"
                className="rounded-full border border-border bg-background-card px-3 py-1.5 text-xs text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    หน้า {p} / {totalPages}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
