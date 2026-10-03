"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer id="contact" className="border-t border-border bg-background-soft">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-base font-bold text-background">
                ล
              </span>
              <span className="text-base font-semibold text-gold-light">
                ล็อตโตเลย์
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-foreground-muted">
              ตรวจผลรางวัลสลากกินแบ่งรัฐบาลง่าย รวดเร็ว แม่นยำ อัปเดตทุกงวด
            </p>
          </div>

          <div className="text-sm text-foreground-muted">
            <p className="font-semibold text-foreground">ติดต่อเรา</p>
            <p className="mt-3">อีเมล: contact@lottoley.example</p>
            <p className="mt-1">เวลาทำการ: ทุกวัน 09:00 – 21:00 น.</p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-foreground-muted">
          <p>
            เว็บไซต์นี้ให้บริการตรวจสอบผลรางวัลสลากกินแบ่งรัฐบาลเพื่อข้อมูลเท่านั้น
            อ้างอิงผลรางวัลอย่างเป็นทางการจากสำนักงานสลากกินแบ่งรัฐบาลเสมอ
          </p>
          <p className="mt-2">© {new Date().getFullYear()} ล็อตโตเลย์. สงวนลิขสิทธิ์.</p>
        </div>
      </div>
    </footer>
  );
}
