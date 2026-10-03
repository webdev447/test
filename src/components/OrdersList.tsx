"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { OrderSummary } from "@/app/actions/orders";
import { ticketKindLabel } from "@/lib/ticket-label";

type ZoomTarget = { number: string; qty: number; price: number };

export default function OrdersList({ orders }: { orders: OrderSummary[] }) {
  const [zoomed, setZoomed] = useState<ZoomTarget | null>(null);

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    document.body.style.overflow = zoomed ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  return (
    <>
      <div className="mt-8 space-y-5">
        {orders.map((order) => (
          <div
            key={order.id}
            className="overflow-hidden rounded-3xl border border-border bg-background-card shadow-md shadow-blue-950/5 transition-shadow hover:shadow-lg sm:p-1"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-background-soft/60 px-5 py-3.5 sm:px-6">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted">
                <CalendarIcon />
                {new Date(order.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  order.status === "paid"
                    ? "bg-success/15 text-success"
                    : order.status === "cancelled"
                      ? "bg-danger/15 text-danger"
                      : "bg-gold/15 text-gold-light"
                }`}
              >
                <DotIcon />
                {order.status === "paid"
                  ? "ชำระเงินแล้ว"
                  : order.status === "cancelled"
                    ? "ยกเลิก"
                    : "รอดำเนินการ"}
              </span>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background-soft px-2.5 py-1 text-xs font-medium text-foreground-muted">
                {order.serviceType === "shipping" ? <TruckIcon /> : <SafeMiniIcon />}
                {order.serviceType === "shipping" ? "จัดส่งลอตเตอรี่ถึงบ้าน" : "เช่าพื้นที่จัดเก็บ"}
                <span className="font-semibold text-gold-light">
                  {order.serviceFee.toLocaleString("th-TH")} บาท
                </span>
              </span>

              <div className="mt-3 divide-y divide-border/60">
                {order.items.map((item) => (
                  <div key={item.ticketId} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomed({ number: item.number, qty: item.qty, price: item.price })
                      }
                      aria-label={`ดูรูปสลากเลข ${item.number}`}
                      className="group relative w-16 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm shadow-black/20 transition-transform active:scale-95 sm:w-20"
                      style={{ aspectRatio: "689 / 343" }}
                    >
                      <Image
                        src="/lotto.jpg"
                        alt={`สลากกินแบ่งรัฐบาล เลข ${item.number}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                        <ZoomIcon />
                      </span>
                    </button>

                    <div className="flex flex-1 items-center justify-between text-sm">
                      <span className="font-semibold tracking-widest text-gold-light">
                        {item.number}
                        <span className="ml-1.5 text-xs font-medium tracking-normal text-foreground-muted">
                          ({ticketKindLabel(item.qty)})
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-foreground-muted">
                        {item.qty} ใบ × {item.price.toLocaleString("th-TH")} บาท
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-sm text-foreground-muted">
                <div className="flex items-center justify-between">
                  <span>ค่าลอตเตอรี่</span>
                  <span>{(order.totalPrice - order.serviceFee).toLocaleString("th-TH")} บาท</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    {order.serviceType === "shipping" ? "ค่าจัดส่งลอตเตอรี่" : "ค่าเช่าพื้นที่จัดเก็บ"}
                  </span>
                  <span>{order.serviceFee.toLocaleString("th-TH")} บาท</span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-3 text-sm font-semibold">
                <span className="text-foreground-muted">รวม {order.totalCount} ใบ</span>
                <span className="text-gold-light">
                  {order.totalPrice.toLocaleString("th-TH")} บาท
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {zoomed && (
        <div
          onClick={() => setZoomed(null)}
          className="animate-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold bg-background-card shadow-2xl shadow-black/50"
          >
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="ปิด"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <CloseIcon />
            </button>

            <div className="relative w-full" style={{ aspectRatio: "689 / 343" }}>
              <Image
                src="/lotto.jpg"
                alt={`สลากกินแบ่งรัฐบาล เลข ${zoomed.number}`}
                fill
                className="object-cover"
                sizes="384px"
              />
            </div>

            <div className="p-5 text-center">
              <p className="text-lg font-bold tracking-widest text-gold-light">
                {zoomed.number}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {zoomed.qty} ใบ × {zoomed.price.toLocaleString("th-TH")} บาท/ใบ
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="12" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16V6a1 1 0 0 1 1-1h9v11" />
      <path d="M13 9h4l4 4v3h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function SafeMiniIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5v0M12 15.5v0M8.5 12h0M15.5 12h0" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
