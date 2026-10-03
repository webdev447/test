import Link from "next/link";
import SearchPageClient from "@/components/SearchPageClient";
import FaqSection from "@/components/FaqSection";
import FaqJsonLd from "@/components/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { CHECKING_FAQ } from "@/lib/checking-faq";
import { ogMeta, getSiteUrl } from "@/lib/site-url";

const TITLE = "ตรวจหวย ตรวจผลรางวัลสลากกินแบ่งรัฐบาล ครบทุกงวด | เจเคลอตเตอรี่";
const DESCRIPTION =
  "ตรวจหวยฟรี ไม่ต้องสมัครสมาชิก เลือกงวดที่ต้องการ กรอกเลขสลาก 6 หลัก เช็กครบทุกรางวัล ทั้งรางวัลที่ 1 รางวัลข้างเคียง เลขหน้า-ท้าย 3 ตัว เลขท้าย 2 ตัว และรางวัลที่ 2-5 พร้อมคำตอบคำถามที่พบบ่อยเกี่ยวกับการตรวจหวย";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...ogMeta(TITLE, DESCRIPTION, `${getSiteUrl()}/search`),
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "หน้าแรก", href: "/" }, { name: "ตรวจผลรางวัล", href: "/search" }]} />

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">ตรวจผลรางวัล</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
        ตรวจผลรางวัลสลากกินแบ่งรัฐบาล
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        เลือกงวดที่ต้องการ กรอกเลข 6 หลัก แล้วกดตรวจสอบ — ครบทุกรางวัล ไม่ใช่แค่รางวัลที่ 1
      </p>

      <SearchPageClient />

      <FaqJsonLd items={CHECKING_FAQ} />
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">คำถามที่พบบ่อย</h2>
        <FaqSection items={CHECKING_FAQ} />
      </div>
    </div>
  );
}
