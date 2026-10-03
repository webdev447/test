import { getSiteUrl } from "@/lib/site-url";

// schema.org Article structured data for one published article page.
export default function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  publishedAt,
  updatedAt,
}: {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  updatedAt: string;
}) {
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: imageUrl ?? `${site}/logo.png`,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: { "@type": "Organization", name: "เจเคลอตเตอรี่" },
    publisher: { "@type": "Organization", name: "เจเคลอตเตอรี่" },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
