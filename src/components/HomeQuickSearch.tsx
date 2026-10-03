"use client";

import { useMemo, useRef, useState } from "react";
import TicketCard from "@/components/TicketCard";
import { matchesPattern } from "@/lib/mock-tickets";
import { useTicketCatalog } from "@/context/TicketCatalogContext";

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "single", label: "หวยเดี่ยว" },
  { key: "set", label: "หวยชุด" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function HomeQuickSearch() {
  const { tickets } = useTicketCatalog();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [filter, setFilter] = useState<FilterKey>("all");
  const resultsRef = useRef<HTMLDivElement>(null);

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)));
  }

  function randomize() {
    // Pick from tickets actually in stock, not just any 6 random digits.
    const inStock = tickets.filter((t) => t.quantity > 0);
    if (inStock.length === 0) return;
    const pick = inStock[Math.floor(Math.random() * inStock.length)];
    setDigits(pick.number.split(""));
  }

  const results = useMemo(() => {
    if (digits.every((d) => d === "")) return [];

    let list = tickets.filter((t) => matchesPattern(t.number, digits));
    if (filter === "single") list = list.filter((t) => t.quantity === 1);
    if (filter === "set") list = list.filter((t) => t.quantity > 1);
    return list;
  }, [tickets, digits, filter]);

  return (
    <>
      <div className="relative z-10 mt-4 rounded-2xl bg-background-card p-5 shadow-xl shadow-black/30 sm:-mx-6">
        {/* Card background spans full width, but the form itself stays a
            comfortable, non-stretched size — centered inside. */}
        <div className="mx-auto max-w-md">
          <h2 className="text-sm font-semibold text-foreground">
            กรอกเลข ค้นหาเลขเด็ด
          </h2>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full py-2 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "btn-gold text-background"
                    : "border border-border text-foreground-muted hover:text-gold-light"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {digits.map((d, i) => (
              <input
                key={i}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                inputMode="numeric"
                maxLength={1}
                placeholder={String(i + 1)}
                className="aspect-square w-full rounded-lg border border-border bg-background text-center text-base font-semibold text-foreground placeholder:text-foreground-muted/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={randomize}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              <SparkleIcon />
              สุ่มตัวเลข
            </button>
            <button
              type="button"
              onClick={() =>
                resultsRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="btn-gold flex flex-1 items-center justify-center rounded-full py-2.5 text-sm font-semibold text-background"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Matching tickets show up right below the search card */}
      {digits.some((d) => d !== "") && (
        <div ref={resultsRef} className="mx-2 mt-4 scroll-mt-20 sm:-mx-6">
          {results.length === 0 ? (
            <p className="text-center text-sm text-foreground-muted">
              ไม่พบเลขที่ตรงกับเงื่อนไข ลองสุ่มใหม่หรือเปลี่ยนเลขดูครับ
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}
