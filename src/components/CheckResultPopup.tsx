"use client";

export type MatchedTier = { label: string; subtitle: string };

// Centered modal announcing a ticket-check result — green/trophy when the
// ticket won something, red/sad-face when it didn't. Same backdrop/modal
// pattern as the login popup in CartContext.tsx (click outside or the ✕ to
// close), just themed per outcome instead of always gold.
export default function CheckResultPopup({
  open,
  won,
  matches,
  onClose,
}: {
  open: boolean;
  won: boolean;
  matches: MatchedTier[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-modal-in relative w-full max-w-sm rounded-3xl border-2 bg-background-card p-6 text-center shadow-2xl shadow-black/50 ${
          won ? "border-success" : "border-danger"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-background"
        >
          <CloseIcon />
        </button>

        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            won ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
          }`}
        >
          {won ? <TrophyIcon /> : <SadIcon />}
        </span>

        <h3 className={`mt-4 text-xl font-bold ${won ? "text-success" : "text-danger"}`}>
          {won ? "ยินดีด้วย คุณถูกรางวัล!" : "เสียใจด้วย เลขนี้ไม่ถูกรางวัล"}
        </h3>

        {won ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {matches.map((m) => (
              <li key={m.label} className="font-semibold text-success">
                ถูก{m.label} <span className="font-normal text-success/80">({m.subtitle})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-foreground-muted">ลองตรวจงวดถัดไปนะครับ</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className={`mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold text-white ${
            won ? "bg-success" : "bg-danger"
          }`}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

function SadIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15c1.2-1.2 2.4-1.8 4-1.8s2.8.6 4 1.8" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}
