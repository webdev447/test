import Image from "next/image";
import { signIn } from "@/auth";
import LineSignInButton from "@/components/LineSignInButton";

export default function LoginPage() {
  return (
    <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft ambient glow behind the card, same language as the home hero */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full overflow-hidden rounded-3xl border border-t-4 border-border border-t-gold bg-background-card p-8 text-center shadow-lg shadow-blue-950/10">
        <Image
          src="/logo.png"
          alt="เจเคลอตเตอรี่"
          width={750}
          height={260}
          className="mx-auto h-14 w-auto"
          priority
        />

        <h1 className="mt-6 text-xl font-bold text-foreground">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          เข้าสู่ระบบด้วยบัญชี LINE ของคุณ เพื่อสั่งซื้อและติดตามสลากของคุณ
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("line", { redirectTo: "/shop" });
          }}
          className="mt-8 w-full"
        >
          <LineSignInButton />
        </form>

        <p className="mt-6 text-xs text-foreground-muted">
          การเข้าสู่ระบบถือว่าคุณยอมรับข้อตกลงการใช้งานของเรา
        </p>
      </div>
    </div>
  );
}
