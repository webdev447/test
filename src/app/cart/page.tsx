"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { ServiceType } from "@/app/actions/cart";
import type { SlipVerifyResult } from "@/app/actions/payment";
import { FACE_VALUE, FIRST_PRIZE } from "@/lib/mock-tickets";
import { formatCountdown } from "@/lib/countdown";
import { ticketKindLabel } from "@/lib/ticket-label";
import PaymentStep from "@/components/PaymentStep";

type PaidResult = Extract<SlipVerifyResult, { ok: true }>;

const SERVICE_OPTIONS: {
  key: ServiceType;
  title: string;
  desc: string;
  longDesc: string;
  unitLabel: string; // how one held ticket is counted in the breakdown — 1 ใบ = 1 ช่อง for storage
  feePerTicket: number;
  badge?: string;
}[] = [
  {
    key: "storage",
    title: "เช่าพื้นที่จัดเก็บ",
    desc: "ไม่ต้องเก็บตั๋วเอง 1 ใบ ใช้พื้นที่จัดเก็บ 1 ช่อง",
    longDesc:
      "รับประกันความปลอดภัย ตรวจรางวัลให้ และโอนเงินรางวัลให้อัตโนมัติทันทีที่ประกาศผล ไม่ต้องเดินทางไปขึ้นเงินเอง",
    unitLabel: "ช่อง",
    feePerTicket: 20,
    badge: "คุ้มค่ากว่า",
  },
  {
    key: "shipping",
    title: "จัดส่งลอตเตอรี่",
    desc: "จัดส่งสลากตัวจริงให้ถึงมือคุณ",
    longDesc: "จัดส่งสลากตัวจริงถึงบ้านคุณ เหมาะสำหรับลูกค้าที่ต้องการเก็บสลากไว้ตรวจเอง",
    unitLabel: "ใบ",
    feePerTicket: 50,
  },
];

type Step = 1 | 2 | 3 | 4;

const STEPS: { key: Step; label: string }[] = [
  { key: 1, label: "ตะกร้า" },
  { key: 2, label: "เลือกช่องทาง" },
  { key: 3, label: "ชำระเงิน" },
  { key: 4, label: "สำเร็จ" },
];

export default function CartPage() {
  const { items, removeTicket, totalPrice, totalCount, refreshCart } = useCart();
  const [step, setStep] = useState<Step>(1);
  const [showAllItems, setShowAllItems] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>("storage");
  const [order, setOrder] = useState<PaidResult | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks once a second to drive the "time left before your hold expires"
  // countdown shown on the checkout button.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // The whole cart is only guaranteed until the soonest-expiring item's hold
  // ends — once that passes, that item drops back into stock for someone else.
  const holdDeadline = useMemo(() => {
    const times = items
      .map((i) => (i.reservedUntil ? new Date(i.reservedUntil).getTime() : null))
      .filter((t): t is number => t !== null);
    return times.length > 0 ? Math.min(...times) : null;
  }, [items]);

  useEffect(() => {
    if (holdDeadline !== null && now >= holdDeadline) {
      refreshCart();
    }
  }, [now, holdDeadline, refreshCart]);

  // If the hold on everything lapsed (or items were removed elsewhere) while
  // picking a service/confirming, bounce back to the cart step.
  useEffect(() => {
    if (items.length === 0 && step > 1 && !order) {
      setStep(1); // eslint-disable-line react-hooks/set-state-in-effect -- resetting to match the (external) empty-cart signal
    }
  }, [items.length, step, order]);

  const selectedService =
    SERVICE_OPTIONS.find((s) => s.key === serviceType) ?? SERVICE_OPTIONS[0];
  const serviceFee = totalCount * selectedService.feePerTicket;
  const grandTotal = totalPrice + serviceFee;
  const countdownLabel = holdDeadline !== null ? ` (${formatCountdown(holdDeadline - now)})` : "";

  function handlePaid(result: PaidResult) {
    setOrder(result);
    setStep(4);
    refreshCart();
  }

  if (order) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Stepper current={4} />
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckIcon />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-foreground">สั่งซื้อสำเร็จ</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          เลขที่คำสั่งซื้อ <span className="text-gold-light">{order.orderId}</span>
        </p>
        <div className="mt-6 w-full rounded-2xl border border-gold bg-gold/10 p-6 text-left">
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            <span>จำนวนสลากทั้งหมด</span>
            <span>{order.totalCount} ใบ</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-foreground-muted">
            <span>ค่าสลาก</span>
            <span>{order.ticketsPrice.toLocaleString("th-TH")} บาท</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-foreground-muted">
            <span>
              {order.serviceType === "shipping" ? "ค่าจัดส่งลอตเตอรี่" : "ค่าเช่าพื้นที่จัดเก็บ"}
            </span>
            <span>{order.serviceFee.toLocaleString("th-TH")} บาท</span>
          </div>
          <div className="my-3 border-t border-dashed border-gold/30" />
          <div className="flex items-center justify-between text-lg font-bold text-gold-light">
            <span>ยอดชำระทั้งหมด</span>
            <span>{order.totalPrice.toLocaleString("th-TH")} บาท</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-foreground-muted">
          * ตรวจสอบยอดชำระเงินเรียบร้อยแล้ว ระบบได้บันทึกคำสั่งซื้อของคุณไว้
        </p>
        <Link
          href="/shop"
          className="btn-gold mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold text-background"
        >
          เลือกซื้อสลากเพิ่ม
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ตะกร้าของคุณ</h1>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-gold" />
        </div>
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-background-card px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background-soft text-gold">
            <CartEmptyIcon />
          </span>
          <p className="mt-4 text-foreground-muted">ยังไม่มีสลากในตะกร้า</p>
          <Link
            href="/shop"
            className="btn-gold mt-5 inline-block rounded-full px-6 py-3 text-sm font-semibold text-background"
          >
            ไปเลือกซื้อสลาก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6 sm:px-6 sm:pt-8 md:pb-28">
        <Stepper current={step} />

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-foreground-muted transition-colors hover:text-gold-light"
          >
            <BackIcon />
            กลับ
          </button>
        )}

        {/* Ticket stack summary — shown on steps 1-2; the payment step (3)
            already has its own amount displayed inline, so this is dropped
            there to keep that screen focused. */}
        {step !== 3 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">รายการลอตเตอรี่</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
                <TicketIcon />
                ทั้งหมด {totalCount} ใบ
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-gold-dark shadow-lg shadow-blue-950/20">
              <div className="relative flex items-center gap-4 p-5">
                <div className="relative h-20 w-32 shrink-0 sm:h-24 sm:w-40">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="absolute inset-0 overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-black/40"
                      style={{
                        transform: `translate(${i * 6}px, ${-i * 6}px) rotate(${(i - 1) * 4}deg)`,
                        zIndex: 3 - i,
                      }}
                    >
                      <Image
                        src="/lotto.jpg"
                        alt=""
                        aria-hidden
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex-1 text-white">
                  <p className="text-xs text-white/70">เลขชุด</p>
                  <p className="text-2xl font-bold">{totalCount} ใบ</p>
                  <p className="mt-1 text-sm text-white/70">
                    มูลค่ารางวัลที่ 1 รวม{" "}
                    <span className="font-semibold text-gold">
                      {((totalCount * FIRST_PRIZE) / 1_000_000).toLocaleString("th-TH")} ล้าน
                    </span>
                  </p>
                </div>
              </div>

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllItems((v) => !v)}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-white/10 bg-white/5 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  {showAllItems ? "ซ่อนรายการ" : "ดูรายการทั้งหมด"}
                  <ChevronDownIcon flipped={showAllItems} />
                </button>
              )}
            </div>
          </>
        )}

        {/* Step 1 — itemized list, editable */}
        {step === 1 && showAllItems && (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-border bg-background-card p-4 transition-colors hover:border-gold/40 sm:p-5"
              >
                <div
                  className="relative w-24 shrink-0 self-start overflow-hidden rounded-xl border border-border shadow-lg shadow-black/30 sm:w-32"
                  style={{ aspectRatio: "689 / 343" }}
                >
                  <Image
                    src="/lotto.jpg"
                    alt={`สลากกินแบ่งรัฐบาล เลข ${item.number}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 128px, 96px"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="text-base font-bold tracking-widest text-gold-light sm:text-lg">
                      {item.number}
                      <span className="ml-1.5 text-xs font-medium tracking-normal text-foreground-muted">
                        ({ticketKindLabel(item.qty)})
                      </span>
                    </p>
                    <p className="mt-1 whitespace-nowrap text-xs text-foreground-muted sm:text-sm">
                      {item.qty} ใบ × {item.price.toLocaleString("th-TH")} บาท/ใบ
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {(item.qty * item.price).toLocaleString("th-TH")} บาท
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTicket(item.id)}
                      aria-label={`ลบเลข ${item.number} ออกจากตะกร้า`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-danger transition-colors hover:border-danger hover:bg-danger/10"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — service type */}
        {step === 2 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">ประเภทของบริการ</h2>
            <div className="mt-3 space-y-3">
              {SERVICE_OPTIONS.map((option) => {
                const selected = option.key === serviceType;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setServiceType(option.key)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-gold bg-gold/10"
                        : "border-border bg-background-card hover:border-gold/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-gold bg-gold" : "border-border"
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-background" />}
                    </span>
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {option.title}
                        </span>
                        {option.badge && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                            {option.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-foreground-muted">
                        {option.desc}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-bold text-gold-light">
                      +{option.feePerTicket} บาท/ใบ
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm leading-6 text-foreground">
              <span className="font-semibold text-success">{selectedService.title}:</span>{" "}
              {selectedService.longDesc}
            </div>
          </div>
        )}

        {/* Step 2 & 3 — price breakdown */}
        {step >= 2 && (
          <div className="mt-6 rounded-2xl border border-gold bg-background-card p-6 shadow-md shadow-blue-950/5">
            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <span>ลอตเตอรี่ {FACE_VALUE} บาท</span>
              <span>{totalCount} ใบ</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm font-medium text-foreground">
              <span>ราคารวม ค่าลอตเตอรี่</span>
              <span>{totalPrice.toLocaleString("th-TH")} บาท</span>
            </div>

            <div className="my-3 border-t border-dashed border-gold/30" />

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <span className="flex items-center gap-1">
                {selectedService.title}
                <span
                  title={`1 ใบ = 1${selectedService.unitLabel === "ช่อง" ? "ช่อง — " : " "}${selectedService.longDesc}`}
                  className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-foreground-muted/20 text-[10px] font-bold text-foreground-muted"
                >
                  i
                </span>
              </span>
              <span>
                {totalCount} {selectedService.unitLabel}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm font-medium text-foreground">
              <span>ราคา</span>
              <span>{serviceFee.toLocaleString("th-TH")} บาท</span>
            </div>

            <div className="my-3 border-t border-dashed border-gold/30" />
            <div className="flex items-center justify-between text-lg font-bold text-gold-light">
              <span>รวมทั้งหมด</span>
              <span>{grandTotal.toLocaleString("th-TH")} บาท</span>
            </div>

            {step === 3 && holdDeadline !== null && (
              <p className="mt-2 text-right text-xs font-semibold text-danger">
                หมดเวลาชำระเงินใน {formatCountdown(holdDeadline - now)}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <PaymentStep
            amount={grandTotal}
            serviceType={serviceType}
            holdDeadline={holdDeadline}
            now={now}
            onPaid={handlePaid}
          />
        )}
      </div>

      {/* Sticky checkout bar — sits above the mobile bottom nav. Step 3's
          amount + countdown are shown inline in the breakdown card above
          instead, and PaymentStep has its own submit button, so the bar is
          hidden there rather than showing a redundant/button-less copy. */}
      {step !== 3 && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-background-card/95 px-4 py-3 backdrop-blur-sm md:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-foreground-muted">ยอดชำระเงิน</p>
              <p className="text-lg font-bold text-gold-light">
                {(step === 1 ? totalPrice : grandTotal).toLocaleString("th-TH")} บาท
              </p>
              <p className="text-[11px] text-foreground-muted">ส่วนลด 0.00 บาท</p>
            </div>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-gold flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold text-background shadow-sm shadow-blue-950/20"
              >
                เลือกช่องทาง{countdownLabel}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-gold flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold text-background shadow-sm shadow-blue-950/20"
              >
                ไปหน้าชำระเงิน{countdownLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((s, i) => {
        const isDone = s.key < current;
        const isCurrent = s.key === current;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isDone
                    ? "bg-gold text-background"
                    : isCurrent
                      ? "btn-gold text-background shadow-sm shadow-blue-950/20"
                      : "bg-background-soft text-foreground-muted"
                }`}
              >
                {isDone ? <MiniCheckIcon /> : s.key}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  isCurrent ? "text-gold-light" : "text-foreground-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1.5 mb-5 h-0.5 flex-1 rounded-full ${
                  s.key < current ? "bg-gold" : "bg-background-soft"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MiniCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CartEmptyIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}

function ChevronDownIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${flipped ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BackIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
