"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { BANK_TRANSFER_ACCOUNT, PROMPTPAY_ACCOUNT } from "@/lib/payment-config";
import { verifyPaymentSlip, type SlipVerifyResult } from "@/app/actions/payment";
import type { ServiceType } from "@/app/actions/cart";
import { formatCountdown } from "@/lib/countdown";

type PaidResult = Extract<SlipVerifyResult, { ok: true }>;
type PaymentMethod = "promptpay" | "bank";

// How long this specific QR is considered valid — separate from (and usually
// shorter than) the cart's stock hold. Purely a display/session concern: our
// QR payload has no server-tracked session, so "expiring" it just means
// resetting the local timer + reference number and letting the customer
// scan again — it never touches stock.
const QR_VALID_MINUTES = 10;

function generateReference() {
  return Math.floor(10_000_000 + Math.random() * 90_000_000).toString();
}

export default function PaymentStep({
  amount,
  serviceType,
  holdDeadline,
  now,
  onPaid,
}: {
  amount: number;
  serviceType: ServiceType;
  holdDeadline: number | null; // ms timestamp — when the cart's stock hold lapses
  now: number; // ms timestamp, ticked by the parent so we don't run a second interval
  onPaid: (result: PaidResult) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDeadline, setQrDeadline] = useState(() => Date.now() + QR_VALID_MINUTES * 60_000);
  const [qrReference, setQrReference] = useState(generateReference);
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const methodCardRef = useRef<HTMLDivElement>(null);
  const isHoldExpired = holdDeadline !== null && now >= holdDeadline;
  const isQrExpired = now >= qrDeadline;

  function regenerateQr() {
    setQrDeadline(Date.now() + QR_VALID_MINUTES * 60_000);
    setQrReference(generateReference());
  }

  // Scroll to the method tabs on every tap — including tapping the one
  // already selected, which wouldn't trigger a `method` state change (and so
  // wouldn't fire a useEffect keyed on it). Anchored on the tabs themselves,
  // not the QR/bank card below them, so the scroll distance is the same
  // either way — the two cards are very different heights and scrolling to
  // whichever one is now shorter (bank) was overshooting past it.
  function selectMethod(next: PaymentMethod) {
    setMethod(next);
    requestAnimationFrame(() => {
      methodCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (method !== "promptpay") return;
    let cancelled = false;
    QRCode.toDataURL(generatePromptPayPayload(PROMPTPAY_ACCOUNT.mobile, amount), {
      width: 280,
      margin: 1,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error("สร้าง QR พร้อมเพย์ไม่สำเร็จ:", err));
    return () => {
      cancelled = true;
    };
  }, [method, amount]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("ไฟล์รูปใหญ่เกินไป (ไม่เกิน 4MB)");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCopyAccount() {
    try {
      await navigator.clipboard.writeText(BANK_TRANSFER_ACCOUNT.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — not worth surfacing an error for
    }
  }

  async function handleSubmit() {
    if (!previewUrl) {
      setError("กรุณาแนบรูปสลิปโอนเงินก่อน");
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const result = await verifyPaymentSlip({ serviceType, slipBase64: previewUrl });
      if (result.ok) {
        onPaid(result);
      } else {
        setError(result.reason);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="flex flex-wrap items-baseline justify-center gap-x-2 text-center text-sm font-semibold text-foreground">
        เลือกช่องทางการชำระเงิน
        <span className="text-xs font-medium text-success">แนบสลิปทุกครั้งหลังโอนเสร็จ</span>
      </h2>

      <div ref={methodCardRef} className="mt-3 scroll-mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => selectMethod("promptpay")}
          className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition-colors ${
            method === "promptpay"
              ? "border-gold bg-gold/10"
              : "border-border bg-background-card hover:border-gold/40"
          }`}
        >
          <QrIcon />
          <span className="text-sm font-semibold text-foreground">สแกน QR พร้อมเพย์</span>
        </button>
        <button
          type="button"
          onClick={() => selectMethod("bank")}
          className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 transition-colors ${
            method === "bank"
              ? "border-gold bg-gold/10"
              : "border-border bg-background-card hover:border-gold/40"
          }`}
        >
          <BankIcon />
          <span className="text-sm font-semibold text-foreground">โอนเข้าบัญชี</span>
        </button>
      </div>

      {method === "promptpay" ? (
        <div className="mt-4 rounded-2xl border border-border bg-background-card p-5">
          <h3 className="text-center text-base font-bold text-foreground">สแกนคิวอาร์โค้ด</h3>

          <div className="relative mt-4 flex flex-col items-center overflow-hidden rounded-2xl">
            <div className={isHoldExpired || isQrExpired ? "pointer-events-none opacity-40 grayscale" : ""}>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it anyway
                <img src={qrDataUrl} alt="QR พร้อมเพย์" className="h-56 w-56" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center text-foreground-muted">
                  กำลังสร้าง QR...
                </div>
              )}
            </div>

            {(isHoldExpired || isQrExpired) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-card/90 px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
                  <ClockIcon />
                </span>
                <p className="text-sm font-bold text-danger">QR หมดเวลาแล้ว</p>
                {isHoldExpired ? (
                  <p className="text-xs text-foreground-muted">
                    สลากถูกปล่อยคืนสต็อกแล้ว กรุณาเลือกสลากใหม่อีกครั้ง
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={regenerateQr}
                    className="btn-gold rounded-full px-4 py-2 text-xs font-semibold text-background"
                  >
                    ขอ QR ใหม่
                  </button>
                )}
              </div>
            )}
          </div>

          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download="promptpay-qr.png"
              className="mx-auto mt-3 flex w-fit items-center justify-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              <DownloadIcon />
              บันทึกรูป QR
            </a>
          )}

          <p className="mt-3 text-center text-xs text-foreground-muted">
            Reference no. <span className="font-semibold text-foreground">{qrReference}</span>
          </p>

          <div className="mt-2 flex justify-center">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                isHoldExpired || isQrExpired
                  ? "border-border text-foreground-muted"
                  : "border-danger/40 text-danger"
              }`}
            >
              {isHoldExpired || isQrExpired
                ? "หมดเวลาชำระ"
                : `กรุณาชำระภายใน ${formatCountdown(qrDeadline - now)}`}
            </span>
          </div>

          <p className="mt-3 text-center text-xl font-bold text-gold-light">
            {amount.toLocaleString("th-TH")} บาท
          </p>
          <p className="text-center text-xs text-foreground-muted">
            โอนให้: {PROMPTPAY_ACCOUNT.accountName}
          </p>

          <button
            type="button"
            onClick={() => setShowStuckHelp((v) => !v)}
            className="mx-auto mt-4 flex items-center justify-center gap-1 text-xs font-medium text-foreground-muted transition-colors hover:text-gold-light"
          >
            จ่ายแล้วค้าง?
            <ChevronDownIcon flipped={showStuckHelp} />
          </button>
          {showStuckHelp && (
            <p className="mt-2 rounded-xl bg-background-soft p-3 text-center text-xs leading-5 text-foreground-muted">
              หากโอนเงินแล้วแต่ระบบยังไม่ยืนยัน ลองแนบรูปสลิปด้านล่างแล้วกด
              &ldquo;ยืนยันการชำระเงิน&rdquo; อีกครั้ง หากยังไม่ผ่าน กรุณาติดต่อแอดมิน
              พร้อมแจ้งเลขอ้างอิง {qrReference}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-border bg-background-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-muted">ธนาคาร</span>
            <span className="font-semibold text-foreground">{BANK_TRANSFER_ACCOUNT.bankName}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-sm">
            <span className="text-foreground-muted">เลขบัญชี</span>
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold tracking-wide text-foreground">
                {BANK_TRANSFER_ACCOUNT.accountNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyAccount}
                aria-label="คัดลอกเลขบัญชี"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-sm">
            <span className="text-foreground-muted">ชื่อบัญชี</span>
            <span className="font-semibold text-foreground">{BANK_TRANSFER_ACCOUNT.accountName}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
            <span className="text-sm text-foreground-muted">ยอดที่ต้องโอน</span>
            <span className="text-xl font-bold text-gold-light">
              {amount.toLocaleString("th-TH")} บาท
            </span>
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-center text-sm font-semibold text-foreground">แนบรูปสลิปโอนเงิน</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 py-6 text-sm font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URI preview
            <img
              src={previewUrl}
              alt="ตัวอย่างสลิป"
              className="h-24 rounded-lg border-2 border-dashed border-gold/50 object-contain"
            />
          ) : (
            <>
              <UploadIcon />
              แตะเพื่อเลือกรูปสลิป
            </>
          )}
        </button>
      </div>

      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isVerifying || !previewUrl || isHoldExpired}
        className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-background shadow-sm shadow-blue-950/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVerifying
          ? "กำลังตรวจสอบสลิป..."
          : isHoldExpired
            ? "หมดเวลาจอง"
            : "ยืนยันการชำระเงิน"}
      </button>
      <p className="mt-2 text-center text-xs text-foreground-muted">
        ระบบตรวจสอบสลิปอัตโนมัติ — ยืนยันได้ภายในไม่กี่วินาที
      </p>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v9M10 10v9M14 10v9M19 10v9M3 19h18" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDownIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="12"
      height="12"
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

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
