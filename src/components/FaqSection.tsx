import type { FaqItem } from "@/lib/checking-faq";

// Plain <details>/<summary> — no client-side JS needed, and unlike a
// React-state accordion, the answer text is already in the rendered HTML
// whether or not it's open, so it's fully crawlable either way.
export default function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-xl border border-border bg-background-card p-4"
        >
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none">
            <span className="flex items-center justify-between gap-2">
              {item.question}
              <span className="shrink-0 text-foreground-muted transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
