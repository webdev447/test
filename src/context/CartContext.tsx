"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { signIn, useSession } from "next-auth/react";
import type { Ticket } from "@/lib/mock-tickets";
import {
  addServerCartItem,
  checkout as checkoutAction,
  clearServerCart,
  getServerCart,
  mergeGuestCart,
  removeServerCartItem,
  type GuestCartItem,
  type ServiceType,
} from "@/app/actions/cart";
import { getPurchasedCount } from "@/app/actions/orders";

type CartItem = {
  id: string;
  number: string;
  price: number;
  qty: number;
  reservedUntil?: string; // ISO timestamp — when this ticket's stock hold expires
};

type CheckoutResult = {
  orderId: string;
  totalCount: number;
  totalPrice: number;
  ticketsPrice: number;
  serviceFee: number;
  serviceType: ServiceType;
};

type CartContextValue = {
  items: CartItem[];
  addTicket: (ticket: Ticket, sourceEl?: HTMLElement | null) => Promise<void>;
  removeTicket: (id: string) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  checkout: (serviceType: ServiceType) => Promise<CheckoutResult>;
  totalCount: number;
  totalPrice: number;
  cartIconRef: RefObject<HTMLElement | null>; // header cart icon — desktop target
  mobileCartIconRef: RefObject<HTMLElement | null>; // bottom-nav cart tab — mobile target
  isSignedIn: boolean;
  purchasedCount: number;
};

// Flies a small "+1" dot from `sourceEl` to the registered cart icon —
// plain DOM/CSS, fire-and-forget, so adding to cart doesn't need extra
// React state/re-renders just for a one-off animation.
function flyToCart(sourceEl: HTMLElement, targetEl: HTMLElement) {
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const dot = document.createElement("div");
  dot.textContent = "+1";
  Object.assign(dot.style, {
    position: "fixed",
    left: `${sourceRect.left + sourceRect.width / 2 - 14}px`,
    top: `${sourceRect.top + sourceRect.height / 2 - 14}px`,
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    background: "var(--gold)",
    color: "var(--background)",
    fontSize: "12px",
    fontWeight: "700",
    zIndex: "9999",
    pointerEvents: "none",
    boxShadow: "0 0 12px rgba(47,143,209,0.7)",
    transition: "transform 0.55s cubic-bezier(0.3,0,0.6,1), opacity 0.55s ease 0.15s",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(dot);

  const dx =
    targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const dy =
    targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

  requestAnimationFrame(() => {
    dot.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
    dot.style.opacity = "0";
  });

  window.setTimeout(() => dot.remove(), 700);
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lottoley_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !!session?.user;

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const cartIconRef = useRef<HTMLElement | null>(null);
  const mobileCartIconRef = useRef<HTMLElement | null>(null);
  // Guards the guest→server cart merge so it only runs once per sign-in.
  const mergedRef = useRef(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [stockError, setStockError] = useState<string | null>(null);

  // Auto-dismiss the stock-error toast.
  useEffect(() => {
    if (!stockError) return;
    const id = window.setTimeout(() => setStockError(null), 4000);
    return () => window.clearTimeout(id);
  }, [stockError]);

  // Lock background scroll while the popup is open.
  useEffect(() => {
    document.body.style.overflow = showLoginPrompt ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLoginPrompt]);

  // --- Guest cart (signed out): plain localStorage, same as before. ---
  useEffect(() => {
    if (status !== "unauthenticated") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw)); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // ignore — start with an empty cart
    }
    setHydrated(true);
  }, [status]);

  useEffect(() => {
    if (status !== "unauthenticated" || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write failures (private browsing, storage disabled, etc.)
    }
  }, [items, status, hydrated]);

  // --- Signed-in cart: lives in Supabase (see src/app/actions/cart.ts). ---
  // On first render after sign-in, fold any guest cart into the server one
  // (so items picked before logging in aren't lost), then load the server
  // cart as the source of truth.
  useEffect(() => {
    if (!isSignedIn || mergedRef.current) return;
    mergedRef.current = true;

    (async () => {
      let guestItems: GuestCartItem[] = [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) guestItems = JSON.parse(raw);
      } catch {
        // ignore
      }

      try {
        if (guestItems.length > 0) {
          await mergeGuestCart(guestItems);
          window.localStorage.removeItem(STORAGE_KEY);
        }
        const serverItems = await getServerCart();
        setItems(serverItems);
      } catch (err) {
        console.error("โหลดตะกร้าจากเซิร์ฟเวอร์ไม่สำเร็จ:", err);
      }
    })();
  }, [isSignedIn]);

  // How many tickets this account has actually bought (across all orders) —
  // powers the "ซื้อไปแล้ว" badge in the navbar.
  useEffect(() => {
    if (!isSignedIn) {
      // Resetting derived state to match the (external) signed-out signal.
      setPurchasedCount(0); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    getPurchasedCount()
      .then(setPurchasedCount)
      .catch((err) => console.error("โหลดจำนวนสลากที่ซื้อไม่สำเร็จ:", err));
  }, [isSignedIn]);

  // Signing out: let the guest-cart effect above take over again next time
  // someone signs in, and start from an empty cart until it (or the guest
  // load effect) populates `items`.
  useEffect(() => {
    if (status === "unauthenticated") {
      mergedRef.current = false;
    }
  }, [status]);

  // Awaits the server-side stock check before touching local state — a
  // ticket number is unique stock, so we can't optimistically assume the
  // add will succeed the way a normal e-commerce qty bump could.
  async function addTicket(ticket: Ticket, sourceEl?: HTMLElement | null) {
    if (!isSignedIn) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      await addServerCartItem(ticket);
    } catch (err) {
      setStockError(
        err instanceof Error ? err.message : "เพิ่มลงตะกร้าไม่สำเร็จ ลองใหม่อีกครั้ง"
      );
      return;
    }

    // On mobile (BottomNav's own breakpoint, md = 768px) fly down to the
    // bottom-nav cart tab instead of up to the header's — it's the one
    // actually within thumb's reach/attention on that layout.
    const isMobileLayout = typeof window !== "undefined" && window.innerWidth < 768;
    const cartTarget =
      (isMobileLayout ? mobileCartIconRef.current : null) ?? cartIconRef.current;

    if (sourceEl && cartTarget) {
      flyToCart(sourceEl, cartTarget);
    } else {
      // Temporary diagnostic — remove once the fly-to-cart animation is
      // confirmed working again. Tells us exactly which side was missing.
      console.warn("flyToCart skipped:", { hasSourceEl: !!sourceEl, hasCartTarget: !!cartTarget });
    }
    const holdUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    setItems((prev) => {
      const existing = prev.find((i) => i.id === ticket.id);
      if (existing) {
        return prev.map((i) =>
          i.id === ticket.id
            ? { ...i, qty: i.qty + 1, reservedUntil: holdUntil }
            : i
        );
      }
      return [
        ...prev,
        {
          id: ticket.id,
          number: ticket.number,
          price: ticket.price,
          qty: 1,
          reservedUntil: holdUntil,
        },
      ];
    });
  }

  function removeTicket(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (isSignedIn) {
      removeServerCartItem(id).catch((err) =>
        console.error("ลบออกจากตะกร้าบนเซิร์ฟเวอร์ไม่สำเร็จ:", err)
      );
    }
  }

  function clearCart() {
    setItems([]);
    if (isSignedIn) {
      clearServerCart().catch((err) =>
        console.error("ล้างตะกร้าบนเซิร์ฟเวอร์ไม่สำเร็จ:", err)
      );
    }
  }

  // Re-pulls the cart from the server — used when a stock hold's countdown
  // reaches zero, so any expired item actually disappears from view instead
  // of just sitting there with a stale "0:00" timer.
  async function refreshCart() {
    if (!isSignedIn) return;
    try {
      const serverItems = await getServerCart();
      setItems(serverItems);
    } catch (err) {
      console.error("รีเฟรชตะกร้าไม่สำเร็จ:", err);
    }
  }

  async function checkout(serviceType: ServiceType): Promise<CheckoutResult> {
    if (!isSignedIn) {
      throw new Error("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
    }
    const result = await checkoutAction(serviceType);
    setItems([]);
    setPurchasedCount((c) => c + result.totalCount);
    return result;
  }

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.qty * i.price, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addTicket,
        removeTicket,
        clearCart,
        refreshCart,
        checkout,
        totalCount,
        totalPrice,
        cartIconRef,
        mobileCartIconRef,
        isSignedIn,
        purchasedCount,
      }}
    >
      {children}

      {stockError && (
        <div className="animate-modal-in pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-danger/30 bg-background-card px-4 py-2.5 text-sm font-medium text-danger shadow-lg shadow-black/10">
            <WarnIcon />
            {stockError}
          </div>
        </div>
      )}

      {showLoginPrompt && (
        <div
          onClick={() => setShowLoginPrompt(false)}
          className="animate-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-in relative w-full max-w-sm rounded-3xl border border-gold bg-background-card p-6 text-center shadow-2xl shadow-black/50"
          >
            <button
              type="button"
              onClick={() => setShowLoginPrompt(false)}
              aria-label="ปิด"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-background hover:text-gold-light"
            >
              <CloseIcon />
            </button>

            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
              <LockIcon />
            </span>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              กรุณาเข้าสู่ระบบก่อน
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              เข้าสู่ระบบด้วยบัญชี LINE เพื่อเพิ่มสลากลงตะกร้า
              และสั่งซื้อได้ทันที
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsSigningIn(true);
                  signIn("line", { callbackUrl: "/shop" });
                }}
                disabled={isSigningIn}
                className="flex items-center justify-center gap-2 rounded-full border-2 border-[#06C755] bg-white px-6 py-3 text-sm font-semibold text-[#06C755] transition-colors hover:bg-[#06C755]/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningIn && <SpinnerIcon />}
                {isSigningIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย LINE"}
              </button>
              <button
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
              >
                ไว้ก่อน
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarnIcon() {
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
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function LockIcon() {
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
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
