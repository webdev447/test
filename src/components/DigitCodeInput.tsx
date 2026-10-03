"use client";

import { useRef } from "react";

// One box per digit (OTP-style) instead of a single text field — easier to
// tap correctly on mobile and reads as "enter your 6-digit ticket number"
// at a glance. Handles auto-advance, backspace-to-previous, and pasting a
// full number across all boxes at once.
export default function DigitCodeInput({
  length,
  value,
  onChange,
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigitAt(index: number, digit: string) {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s+$/, "").replace(/ /g, ""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigitAt(index, digit);
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`เลขสลากหลักที่ ${i + 1}`}
          className="h-12 w-10 rounded-xl border border-border bg-background-soft text-center text-xl font-bold text-foreground shadow-inner focus:border-gold focus:bg-background-card focus:outline-none focus:ring-2 focus:ring-gold/40 sm:h-14 sm:w-12 sm:text-2xl"
        />
      ))}
    </div>
  );
}
