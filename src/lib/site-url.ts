// Falls back to localhost in development. Set NEXT_PUBLIC_SITE_URL in
// .env.local once there's a real production domain — metadataBase,
// sitemap.ts, robots.ts, and BreadcrumbJsonLd all read it from here, so
// nothing else needs to change when the real domain is known.
export function getSiteUrl(): string {
  // `?? ""` alone isn't enough — an env var set to an empty string (as it
  // is in .env.local until a real domain exists) is still "present", so
  // check for a non-empty value explicitly rather than just nullishness.
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Per-page Open Graph/Twitter Card metadata, for the pages most likely to
// get shared (a result link dropped in a LINE group, say) — without this,
// a shared link falls back to the generic site-wide card from layout.tsx
// (still branded, just not specific to what's actually being shared).
export function ogMeta(title: string, description: string, url: string, imageUrl?: string) {
  const image = imageUrl
    ? { url: imageUrl }
    : { url: "/logo.png", width: 750, height: 260, alt: "เจเคลอตเตอรี่ (JK Lottery)" };
  return {
    openGraph: { title, description, url, images: [image] },
    twitter: { card: "summary_large_image" as const, title, description, images: [image.url] },
  };
}
