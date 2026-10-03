import { getSiteUrl } from "@/lib/site-url";

// Matches the visual breadcrumb nav already on /number/[number] and
// /results — same list, just also machine-readable. Schema.org wants
// absolute URLs for ListItem.item, so hrefs are resolved against the site's
// real domain (see src/lib/site-url.ts) rather than left relative.
export default function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${site}${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
