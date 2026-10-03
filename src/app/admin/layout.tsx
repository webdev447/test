import Link from "next/link";
import { getCurrentUserId } from "@/app/actions/admin";
import { isAdminUserId } from "@/lib/admin-auth";

const ADMIN_NAV = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/members", label: "สมาชิก" },
  { href: "/admin/tickets", label: "คลังหวย" },
  { href: "/admin/orders", label: "ออเดอร์" },
  { href: "/admin/draws", label: "ผลสลากย้อนหลัง" },
  { href: "/admin/articles", label: "บทความ" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();

  if (!isAdminUserId(userId)) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-foreground">ไม่มีสิทธิ์เข้าถึงส่วนนี้</h1>
        {userId ? (
          <>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              บัญชีนี้ยังไม่มีสิทธิ์แอดมิน ส่งเลขนี้ให้ผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง:
            </p>
            <p className="mt-3 select-all rounded-xl border border-border bg-background-card px-4 py-2.5 font-mono text-sm text-gold-light">
              {userId}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            กรุณา{" "}
            <Link href="/login" className="font-semibold text-gold-light underline">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อนเข้าใช้งานส่วนนี้
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="text-sm font-bold text-gold-light">
            หลังบ้าน · เจเคลอตเตอรี่
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-foreground-muted transition-colors hover:text-gold-light"
          >
            กลับหน้าเว็บ
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-soft hover:text-gold-light"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
