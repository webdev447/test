import type { FaqItem } from "@/lib/checking-faq";

// FAQPage structured data — this is what makes a "People Also Ask" /
// featured-snippet appearance realistic even for a low-authority domain,
// since those SERP features key off well-marked-up direct answers more
// than backlink/domain-age signals.
export default function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
