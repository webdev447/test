"use client";

import Link from "next/link";

const LINKS = [
  { href: "/shop", label: "ซื้อสลาก", icon: ShopIcon },
  { href: "/search", label: "ตรวจผลรางวัล", icon: SearchIcon },
  { href: "/results/latest", label: "ผลหวยล่าสุด", icon: ResultsIcon },
  { href: "/cart", label: "ตะกร้า", icon: CartIcon },
  { href: "/orders", label: "ตู้เซฟ", icon: SafeIcon },
  { href: "/profile", label: "โปรไฟล์", icon: UserIcon },
];

export default function QuickLinks({
  bordered = true,
}: {
  // The colored top accent reads nicely on /shop where this card sits
  // flush/attached to the search form below it, but on the home page (where
  // it's a standalone card followed by a gap) it didn't match the other
  // (borderless) cards next to it — so it's opt-out per page rather than
  // removed globally.
  bordered?: boolean;
}) {
  return (
    <div
      // Respects the parent page's own padding at the base breakpoint (so it
      // lines up with sibling cards that do the same, e.g. the search form),
      // then cancels that same padding from sm: up to go edge-to-edge of the
      // page's own max-width container — same trick the hero banner and
      // those sibling cards use, so widths stay consistent everywhere this
      // is dropped in (currently home, at px-4, and /shop, at px-3).
      className={`rounded-3xl bg-white px-4 py-4 sm:-mx-6 sm:px-6 ${
        bordered ? "border-t-4 border-t-gold" : ""
      }`}
    >
      {/* Icons cluster in a constrained width, centered within the full-bleed
          white bar above — a single row spanning the whole viewport looked
          fine on mobile but spread out with huge gaps on wide desktops. Now
          6 items: 3x2 on mobile (fits thumbs better than 6 cramped columns),
          one row of 6 from sm: up. */}
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-x-1.5 gap-y-4 sm:max-w-lg sm:grid-cols-6 sm:gap-3">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span className="btn-gold flex h-12 w-12 items-center justify-center rounded-2xl text-background shadow-sm shadow-blue-950/20 transition-transform active:scale-95 sm:h-14 sm:w-14">
              <Icon />
            </span>
            <span className="text-[11px] font-medium leading-tight text-foreground-muted sm:text-xs">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}

function SafeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5v0M12 15.5v0M8.5 12h0M15.5 12h0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}
