import type { MetadataRoute } from "next";
import { getAllDrawDates } from "@/app/actions/lottery";
import { getPublishedArticles } from "@/app/actions/articles";
import { getUpcomingDrawDates, UPCOMING_SEO_DRAWS_COUNT } from "@/lib/draw-schedule";
import { getSiteUrl } from "@/lib/site-url";

// Lists every per-draw permalink (/results/[date]) — both real historical
// draws and the next few not-yet-announced ones — so Google can discover
// and pre-crawl an upcoming draw's URL before the results exist, which is
// the whole point of publishing it early (see /results/[date]/page.tsx).
//
// Without `revalidate`, Next.js prerenders this once at build time and
// never touches the DB again — a draw added later via /admin/draws would
// never appear until the next deploy. Regenerating at most once an hour
// keeps it current without querying the DB on every single crawler hit.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  // Lightweight — just draw_date, not every prize tier for all 470+ draws
  // (the same over-fetching bug fixed elsewhere this session applied here
  // too; a sitemap only ever needs the URL + lastModified, nothing else).
  const draws = await getAllDrawDates();
  const upcoming = getUpcomingDrawDates(UPCOMING_SEO_DRAWS_COUNT);
  const articles = await getPublishedArticles();

  const staticPages: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: "daily", priority: 1 },
    { url: `${site}/shop`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site}/statistics`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site}/results`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site}/results/latest`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site}/articles`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const drawPages: MetadataRoute.Sitemap = draws.map((d) => ({
    url: `${site}/results/${d.drawDate}`,
    lastModified: d.drawDate,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Higher priority than settled historical pages — these are the ones
  // that most need a re-crawl soon (around/after the draw date).
  const upcomingPages: MetadataRoute.Sitemap = upcoming.map((date) => ({
    url: `${site}/results/${date}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${site}/articles/${a.slug}`,
    lastModified: a.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...upcomingPages, ...drawPages, ...articlePages];
}
