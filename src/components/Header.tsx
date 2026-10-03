"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: HomeMenuIcon },
  { href: "/shop", label: "ซื้อสลาก", icon: ShopMenuIcon },
  { href: "/search", label: "ตรวจผลรางวัล", icon: SearchMenuIcon },
  { href: "/#how-it-works", label: "วิธีใช้งาน", icon: HelpMenuIcon },
  { href: "/#contact", label: "ติดต่อเรา", icon: ContactMenuIcon },
];

export default function Header() {
  const pathname = usePathname();
  const { totalCount, cartIconRef, purchasedCount } = useCart();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // A stable callback (not a fresh inline arrow function every render) —
  // otherwise React treats the ref as "changed" on every re-render and
  // briefly detaches (null) + reattaches it, which is wasted churn on
  // every keystroke/state update anywhere that touches this component.
  const setCartIconRef = useCallback(
    (el: HTMLElement | null) => {
      cartIconRef.current = el;
    },
    [cartIconRef]
  );

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            onClick={() => setMenuOpen(false)}
          >
            <Image src="/logo.png" alt="เจเคลอตเตอรี่" width={750} height={260} className="h-10 w-auto sm:h-11" priority />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground-muted transition-colors hover:text-gold-light"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {status === "authenticated" && session.user ? (
              <>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-1 transition-colors hover:border-gold hover:text-gold-light sm:gap-2 sm:pr-3"
                    aria-label="โปรไฟล์"
                  >
                    {session.user.image && (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={28}
                        height={28}
                        className="shrink-0 rounded-full"
                      />
                    )}
                    <span className="hidden max-w-[7rem] truncate text-sm font-medium text-foreground-muted sm:inline-block md:max-w-[9rem]">
                      {session.user.name}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ redirectTo: "/" })}
                    aria-label="ออกจากระบบ"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs sm:font-medium"
                  >
                    <span className="sm:hidden">
                      <LogoutIcon />
                    </span>
                    <span className="hidden sm:inline">ออกจากระบบ</span>
                  </button>
                </div>
                <Link
                  href="/cart"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
                  aria-label="ตะกร้าสินค้า"
                  onClick={() => setMenuOpen(false)}
                >
                  <span
                    ref={setCartIconRef}
                    className={`inline-flex ${totalCount > 0 ? "animate-cart-pulse" : ""}`}
                  >
                    <CartIcon />
                  </span>
                  {totalCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-background">
                      {totalCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/orders"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
                  aria-label="สลากที่ซื้อแล้ว"
                  onClick={() => setMenuOpen(false)}
                >
                  <TicketIcon />
                  {purchasedCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-background">
                      {purchasedCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="btn-gold rounded-full px-4 py-2 text-sm font-semibold text-background"
              >
                เข้าสู่ระบบ
              </Link>
            )}
            <Link
              href="/shop"
              className="btn-gold hidden rounded-full px-4 py-2 text-sm font-semibold text-background sm:inline-block"
            >
              ซื้อสลาก
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light md:hidden"
              aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/*
        Backdrop + drawer live OUTSIDE <header> on purpose: <header> has
        backdrop-blur (backdrop-filter), which makes it the containing block
        for any position:fixed descendant. That collapsed the drawer's
        height to the header's own 64px instead of the full viewport, so its
        background only covered a sliver and the page showed through behind
        the menu items.
      */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile menu drawer — slides in from the left */}
      <nav
        aria-label="เมนูหลัก"
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[80vw] transform flex-col border-r border-border bg-white p-4 shadow-2xl transition-transform duration-300 md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Image src="/logo.png" alt="เจเคลอตเตอรี่" width={750} height={260} className="h-9 w-auto" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="ปิดเมนู"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
          >
            <CloseIcon />
          </button>
        </div>

        {status === "authenticated" && session.user ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {session.user.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                signOut({ redirectTo: "/" });
              }}
              className="shrink-0 text-xs font-medium text-danger hover:underline"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="mt-6 block rounded-full border-2 border-[#06C755] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#06C755] transition-colors hover:bg-[#06C755]/10"
          >
            เข้าสู่ระบบด้วย LINE
          </Link>
        )}

        <ul className="mt-4 flex flex-col divide-y divide-border/60 rounded-xl border border-border">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <link.icon />
                </span>
                <span className="flex-1 group-hover:text-gold-light">{link.label}</span>
                <ChevronIcon />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/shop"
          onClick={() => setMenuOpen(false)}
          className="btn-gold mt-auto block rounded-full px-3 py-2.5 text-center text-sm font-semibold text-background"
        >
          ซื้อสลาก
        </Link>
      </nav>
    </>
  );
}

function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function HomeMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function ShopMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

function SearchMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HelpMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.6-1.4c.5.7.4 1.7-.3 2.3l-.8.7a2 2 0 0 0-.7 1.5V13" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ContactMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-foreground-muted/50">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      width="18"
      height="18"
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

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
