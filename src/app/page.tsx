import HomeQuickSearch from "@/components/HomeQuickSearch";
import HomeTicketPreview from "@/components/HomeTicketPreview";
import QuickLinks from "@/components/QuickLinks";

const HERO_PERKS = [
  "ถูกรางวัลรับเต็ม ไม่หักเปอร์เซ็นต์",
  "โอนเงินรางวัลอัตโนมัติ ไวใน 24 ชม.",
  "ตรวจผลให้ทันทีที่ประกาศ",
  "เก็บสลากปลอดภัย ไม่ต้องเก็บตั๋วเอง",
];

const STEPS = [
  {
    title: "กรอกเลข 6 หลัก",
    desc: "ใส่เลขสลากที่คุณซื้อ เลือกงวดที่ต้องการตรวจสอบ",
  },
  {
    title: "กดตรวจผล",
    desc: "ระบบเทียบผลกับประกาศอย่างเป็นทางการให้ทันที",
  },
  {
    title: "ดูผลรางวัลของคุณ",
    desc: "รู้ผลว่าถูกรางวัลอะไรบ้าง ครบทุกประเภทรางวัล",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero — same single-column layout at every screen size (mobile
          design, just centered on wider viewports); no separate desktop
          two-column variant anymore. */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <QuickLinks bordered={false} />

          <HomeQuickSearch />

          {/* Ticket preview — moved up so products show right away, before perks */}
          <div className="mt-4 rounded-2xl bg-background-card p-4 text-center shadow-sm shadow-blue-950/5 sm:-mx-6">
            <h2 className="text-xl font-semibold text-foreground">เลขเด็ดแนะนำ</h2>
            <HomeTicketPreview />
          </div>

          <div className="mx-auto mt-10 max-w-md px-4 text-center">
            <ul className="mx-auto grid gap-3 rounded-2xl border border-border bg-background-card/60 p-5 text-left sm:grid-cols-2">
              {HERO_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <CheckIcon />
                  </span>
                  <span className="text-sm leading-6 text-foreground-muted">
                    {perk}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            วิธีใช้งาน
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border bg-background-card p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-background">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground-muted">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
