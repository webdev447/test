"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useTicketAvailability } from "@/context/TicketAvailabilityContext";
import { formatCountdown } from "@/lib/countdown";
import { FIRST_PRIZE, type Ticket } from "@/lib/mock-tickets";

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  const { addTicket } = useCart();
  const { availability, refresh } = useTicketAvailability();
  const [now, setNow] = useState(() => Date.now());
  const [isAdding, setIsAdding] = useState(false);

  const info = availability[ticket.id];
  const releaseAt = info?.releaseAt ? new Date(info.releaseAt).getTime() : null;
  // Only actually "จองแล้ว" once we've heard back from the server — before
  // that, assume available rather than flash a false reserved state.
  const isReserved = info !== undefined && info.availableQty <= 0;

  useEffect(() => {
    if (releaseAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [releaseAt]);

  // Once the soonest hold on this ticket lapses, re-check with the server
  // instead of just sitting on a stale "0:00".
  useEffect(() => {
    if (releaseAt !== null && now >= releaseAt) {
      refresh();
    }
  }, [now, releaseAt, refresh]);

  const potentialPrize = ticket.quantity * FIRST_PRIZE;
  const potentialPrizeMillions = potentialPrize / 1_000_000;
  const prizeLabel =
    ticket.quantity > 1
      ? `ชุด ${ticket.quantity} ใบ ${potentialPrizeMillions} ล้าน`
      : `${ticket.quantity} ใบ ${potentialPrizeMillions} ล้าน`;

  async function handleAdd(e: React.MouseEvent<HTMLButtonElement>) {
    const sourceEl = e.currentTarget;
    setIsAdding(true);
    try {
      await addTicket(ticket, sourceEl);
      refresh();
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-background-card shadow-md shadow-blue-950/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10">
      {/* Ticket visual — sits in its own padded, shadowed frame so it reads
          as a photo floating above the card, not flush with the edges. */}
      <div className="p-2.5 pb-0">
        <div
          className="relative w-full overflow-hidden rounded-xl shadow-sm shadow-black/15"
          style={{ aspectRatio: "689 / 343" }}
        >
          <Image
            src={ticket.imageUrl || "/lotto.jpg"}
            alt={`สลากกินแบ่งรัฐบาล เลข ${ticket.number}`}
            fill
            className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              isReserved ? "grayscale" : ""
            }`}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />

          {ticket.isNicePrefix && !isReserved && (
            <span className="absolute left-2 top-2 rounded-full bg-gold/90 px-2 py-0.5 text-[11px] font-semibold text-background shadow-sm">
              เลขหน้าสวย
            </span>
          )}

          {isReserved && (
            <span className="absolute -left-9 top-3.5 w-36 -rotate-45 bg-danger py-1 text-center text-[11px] font-bold tracking-wide text-white shadow-md shadow-black/30">
              จองแล้ว
            </span>
          )}
        </div>
      </div>

      {/* Info + actions — label/value rows keep to one line each (whitespace-nowrap)
          and the button sits on its own full-width row so narrow 2-up mobile
          cards don't wrap/misalign price and button side by side. */}
      <div className="p-3 sm:p-4">
        {isReserved ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs sm:text-sm">
            <LockIcon />
            <span className="whitespace-nowrap font-bold text-danger">
              จองแล้ว{releaseAt !== null ? ` • หลุดจองใน ${formatCountdown(releaseAt - now)}` : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs sm:text-sm">
            <TrophyIcon />
            <span className="whitespace-nowrap font-bold text-success">{prizeLabel}</span>
          </div>
        )}

        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-base font-bold text-gold-light sm:text-lg">
            {ticket.price.toLocaleString("th-TH")}
          </span>
          <span className="text-xs text-foreground-muted">บาท/ใบ</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isReserved || isAdding}
          className="btn-gold mt-2 w-full whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold text-background shadow-sm shadow-blue-950/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          {isReserved ? "ถูกจองแล้ว" : isAdding ? "กำลังเพิ่ม..." : "เพิ่มลงตะกร้า"}
        </button>
      </div>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
