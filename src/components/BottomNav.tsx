"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

const TABS = [
  { href: "/", label: "หน้าแรก", icon: HomeIcon },
  { href: "/shop", label: "ซื้อสลาก", icon: ShopIcon },
  { href: "/cart", label: "ตะกร้า", icon: CartIcon },
  { href: "/orders", label: "ตู้เซฟ", icon: SafeIcon },
  { href: "/profile", label: "โปรไฟล์", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { totalCount, purchasedCount, mobileCartIconRef } = useCart();

  // Stable callback — an inline arrow function here would make React detach
  // + reattach the ref on every re-render (e.g. every totalCount change).
  const setMobileCartIconRef = useCallback(
    (el: HTMLElement | null) => {
      mobileCartIconRef.current = el;
    },
    [mobileCartIconRef]
  );

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="เมนูด่วน"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-5">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-gold-light" : "text-foreground-muted"
              }`}
            >
              <span
                className="relative"
                ref={tab.href === "/cart" ? setMobileCartIconRef : undefined}
              >
                {tab.href === "/cart" && totalCount > 0 ? (
                  <span className="animate-cart-pulse inline-flex">
                    <Icon />
                  </span>
                ) : (
                  <Icon />
                )}
                {tab.href === "/cart" && totalCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-background">
                    {totalCount}
                  </span>
                )}
                {tab.href === "/orders" && purchasedCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-background">
                    {purchasedCount}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function SafeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5v0M12 15.5v0M8.5 12h0M15.5 12h0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}
