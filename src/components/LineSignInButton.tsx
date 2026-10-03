"use client";

import { useFormStatus } from "react-dom";

// Must be a child of the <form action={...}> that calls signIn() — useFormStatus
// only reports pending state for the nearest ancestor form, and only works
// inside a Client Component, which is why this is split out of the (server
// component) login page itself.
export default function LineSignInButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#06C755] bg-white px-6 py-3.5 text-sm font-semibold text-[#06C755] shadow-sm transition-colors hover:bg-[#06C755]/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <SpinnerIcon /> : <LineIcon />}
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย LINE"}
    </button>
  );
}

function LineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 5.58 2 10c0 3.94 3.53 7.24 8.31 7.88.32.07.76.21.87.49.1.25.06.65.03.9l-.14.85c-.04.25-.19.98.86.54 1.05-.45 5.66-3.33 7.72-5.71C20.9 12.87 22 11.51 22 10c0-4.42-4.48-8-10-8Zm-3.65 9.9H6.9a.3.3 0 0 1-.3-.3V7.9a.3.3 0 0 1 .3-.3h.6a.3.3 0 0 1 .3.3v3.1h1.55a.3.3 0 0 1 .3.3v.6a.3.3 0 0 1-.3.3Zm1.85-.3a.3.3 0 0 1-.3.3h-.6a.3.3 0 0 1-.3-.3V7.9a.3.3 0 0 1 .3-.3h.6a.3.3 0 0 1 .3.3v3.7Zm4.35 0a.3.3 0 0 1-.3.3h-.55a.31.31 0 0 1-.24-.12l-1.7-2.3v2.12a.3.3 0 0 1-.3.3h-.6a.3.3 0 0 1-.3-.3V7.9a.3.3 0 0 1 .3-.3h.55c.09 0 .18.04.24.12l1.7 2.3V7.9a.3.3 0 0 1 .3-.3h.6a.3.3 0 0 1 .3.3v3.7Zm3.6-2.8a.3.3 0 0 1-.3.3h-1.55v.6h1.55a.3.3 0 0 1 .3.3v.6a.3.3 0 0 1-.3.3h-2.45a.3.3 0 0 1-.3-.3V7.9a.3.3 0 0 1 .3-.3h2.45a.3.3 0 0 1 .3.3v.6a.3.3 0 0 1-.3.3h-1.55v.6h1.55a.3.3 0 0 1 .3.3v.1Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
