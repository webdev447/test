"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The spec's own "ระบบค้นหาเลข" search box — kept off the app's existing
// /search route (that's the "did my ticket win" checker, a different
// feature) and given its own home here on /statistics instead.
export default function StatisticsSearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = value.trim();
    if (!/^\d{2,3}$/.test(digits)) {
      setError("กรอกเลข 2 หรือ 3 หลัก (เช่น 27 หรือ 527)");
      return;
    }
    router.push(`/number/${digits}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label className="text-sm font-semibold text-foreground">ค้นหาสถิติเลขของคุณ</label>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, "").slice(0, 3));
            setError(null);
          }}
          inputMode="numeric"
          placeholder="เช่น 27 หรือ 527"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-lg tracking-widest text-foreground placeholder:text-foreground-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <button
          type="submit"
          className="btn-gold shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-background"
        >
          ค้นหา
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-2 text-xs text-foreground-muted">
        รองรับเลข 0 นำหน้า เช่น 01, 007 — ไม่ตัดเลข 0 ออก
      </p>
    </form>
  );
}
