"use client";

import { useMemo, useState } from "react";
import QuickLinks from "@/components/QuickLinks";
import TicketCard from "@/components/TicketCard";
import { matchesPattern } from "@/lib/mock-tickets";
import { useTicketCatalog } from "@/context/TicketCatalogContext";

type FilterKey = "all" | "single" | "set" | "nice" | "random";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ดูทั้งหมด" },
  { key: "single", label: "ใบเดี่ยว" },
  { key: "set", label: "เลขชุด" },
  { key: "nice", label: "เลขหน้าสวย" },
  { key: "random", label: "🎲 เลขสุ่ม" },
];

export default function ShopPage() {
  const { tickets } = useTicketCatalog();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [randomSeed, setRandomSeed] = useState(0);

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)));
  }

  function reset() {
    setDigits(Array(6).fill(""));
    setFilter("all");
  }

  function randomizeDigits() {
    // Pick from tickets actually in stock, not just any 6 random digits.
    const inStock = tickets.filter((t) => t.quantity > 0);
    if (inStock.length === 0) return;
    const pick = inStock[Math.floor(Math.random() * inStock.length)];
    setDigits(pick.number.split(""));
  }

  const results = useMemo(() => {
    let list = tickets.filter((t) => matchesPattern(t.number, digits));

    if (filter === "single") list = list.filter((t) => t.quantity === 1);
    if (filter === "set") list = list.filter((t) => t.quantity > 1);
    if (filter === "nice") list = list.filter((t) => t.isNicePrefix);
    if (filter === "random") {
      // Deterministic shuffle keyed by randomSeed so re-rolling gives a new order.
      list = [...list].sort(
        (a, b) =>
          ((a.id.charCodeAt(1) + randomSeed) % 7) -
          ((b.id.charCodeAt(1) + randomSeed) % 7)
      );
    }

    return list;
  }, [tickets, digits, filter, randomSeed]);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-6">
      <QuickLinks bordered={false} />

      {/* A separate card from QuickLinks above it, matching the home page's
          card treatment — no shared blue border, own gap and full rounding. */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background-card shadow-md shadow-blue-950/5 sm:-mx-6">
        {/* Card background spans the full width (matching QuickLinks above
            it), but the form itself stays a comfortable, non-stretched
            size — centered inside, so it doesn't blow up into oversized
            boxes/buttons on wide desktop screens. */}
        <div className="mx-auto max-w-md px-5 pb-6 pt-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              กรอกเลข ค้นหาเลขเด็ด
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-sm font-medium text-danger hover:underline"
            >
              รีเซ็ต
            </button>
          </div>

          {/* 6-digit search boxes */}
          <div className="mt-4 grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                inputMode="numeric"
                maxLength={1}
                placeholder={String(i + 1)}
                className="aspect-square w-full rounded-xl border border-border bg-background text-center text-lg font-semibold text-foreground placeholder:text-foreground-muted/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            ))}
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  if (f.key === "random") setRandomSeed((s) => s + 1);
                }}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "btn-gold text-background"
                    : "bg-background text-foreground-muted hover:text-gold-light"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={randomizeDigits}
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              <SparkleIcon />
              สุ่มตัวเลข
            </button>
          </div>

          <button
            type="button"
            onClick={() => filter === "random" && setRandomSeed((s) => s + 1)}
            className="btn-gold mt-4 flex w-full items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-background shadow-sm shadow-blue-950/20"
          >
            <SearchIcon />
            ค้นหา
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-5">
        {results.length === 0 ? (
          <p className="mt-4 text-center text-sm text-foreground-muted">
            ไม่พบเลขที่ตรงกับเงื่อนไข ลองเปลี่ยนตัวเลขหรือตัวกรองดูครับ
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
