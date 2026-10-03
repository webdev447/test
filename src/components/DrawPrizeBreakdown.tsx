import type { DrawRecord } from "@/lib/lottery-stats";
import { PRIZE_TIERS, getTierValues, type PrizeTierKey } from "@/lib/prize-tiers";

// Renders every prize tier GLO draws (not just the four headline
// categories). Two different looks depending on whether a tier is out yet:
// - Real numbers: plain flat chips, easy to read — รางวัลที่ 1 gets a
//   bigger gold-tinted chip since it's the headline number, every other
//   tier is a simple neutral chip per whole number.
// - Not out yet: the glossy silver "lottery ball" placeholder (รางวัลที่ 1
//   split into a ball per digit, every other tier one ball per slot) — a
//   deliberately different, more "waiting to be revealed" look than the
//   plain style real numbers get.
// Passing `draw={null}` (or a draw missing some tiers) is what lets the
// exact same layout serve both an announced result and a not-yet-announced
// "coming soon" page — only the values/style per tier change, never the
// shape of the page.
export default function DrawPrizeBreakdown({ draw }: { draw: DrawRecord | null }) {
  return (
    <div className="mt-6 space-y-4">
      {tierCard(draw, "first")}
      {tierCard(draw, "last2")}
      <div className="grid grid-cols-2 gap-4">
        {tierCard(draw, "front3")}
        {tierCard(draw, "back3")}
      </div>
      {tierCard(draw, "near1")}
      {tierCard(draw, "second")}
      {tierCard(draw, "third")}
      {tierCard(draw, "fourth")}
      {tierCard(draw, "fifth")}
    </div>
  );
}

function ballGradient() {
  return "radial-gradient(circle at 35% 30%, #f5f5f5, #dcdcdc 45%, #b8b8b8 75%, #999999 100%)";
}

const BALL_SHADOW = "0 2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.6)";

function tierCard(draw: DrawRecord | null, key: PrizeTierKey) {
  const tier = PRIZE_TIERS.find((t) => t.key === key)!;
  const values = getTierValues(draw, key);
  // Not just "the right number of slots" — a tier can be drawn/saved
  // progressively before the whole result is final (see src/lib/glo-api.ts),
  // so an empty-string placeholder in an otherwise-full-length array still
  // counts as "not out yet" for this tier.
  const hasData = values.length === tier.count && values.every((v) => v !== "");
  const isFirst = key === "first";

  return (
    <div key={key} className="overflow-hidden rounded-2xl border border-border bg-background-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 bg-foreground px-4 py-3">
        <h3 className="text-sm font-bold text-background">{tier.label}</h3>
        <span className="text-xs text-background/70">{tier.subtitle}</span>
      </div>

      {hasData ? (
        <div className="flex flex-wrap justify-center gap-2 p-4">
          {values.map((v, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 font-bold tracking-widest ${
                isFirst ? "bg-gold/10 text-xl text-gold-light sm:text-2xl" : "bg-background-soft text-sm text-foreground sm:text-base"
              }`}
            >
              {v}
            </span>
          ))}
        </div>
      ) : isFirst ? (
        <DigitBalls value={"X".repeat(tier.digitLength)} />
      ) : (
        <div className="flex flex-wrap justify-center gap-2.5 p-4 sm:gap-3">
          {Array.from({ length: tier.count }, (_, i) => (
            <span
              key={i}
              className="inline-flex min-w-12 items-center justify-center rounded-full px-3.5 py-2 text-sm font-extrabold tracking-widest text-neutral-800 sm:min-w-14 sm:text-base"
              style={{ background: ballGradient(), boxShadow: BALL_SHADOW }}
            >
              {"X".repeat(tier.digitLength)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DigitBalls({ value }: { value: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 p-5 sm:gap-3">
      {value.split("").map((digit, i) => (
        <span
          key={i}
          className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-extrabold text-neutral-800 sm:h-14 sm:w-14 sm:text-2xl"
          style={{ background: ballGradient(), boxShadow: BALL_SHADOW }}
        >
          {digit}
        </span>
      ))}
    </div>
  );
}
