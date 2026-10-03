import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getPublishedArticles } from "@/app/actions/articles";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ArticleJsonLd from "@/components/ArticleJsonLd";
import { formatThaiDate } from "@/lib/draw-schedule";
import { getSiteUrl, ogMeta } from "@/lib/site-url";

type Params = { slug: string };

// Same ISR pattern fixed this session for /results/[date] — a dynamic
// segment never gets cached at all (regardless of `revalidate`) without a
// generateStaticParams, even one over a small/changing list like this.
export const revalidate = 300;

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const canonical = `${getSiteUrl()}/articles/${slug}`;
  return {
    title: `${article.title} | เจเคลอตเตอรี่`,
    description: article.excerpt,
    alternates: { canonical },
    ...ogMeta(article.title, article.excerpt, canonical, article.coverImageUrl ?? undefined),
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const canonical = `${getSiteUrl()}/articles/${slug}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "หน้าแรก", href: "/" },
          { name: "บทความ", href: "/articles" },
          { name: article.title, href: `/articles/${slug}` },
        ]}
      />
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        url={canonical}
        imageUrl={article.coverImageUrl}
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
      />

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <Link href="/articles" className="hover:text-gold-light">
          บทความ
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">{article.title}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{article.title}</h1>
      <p className="mt-2 text-xs text-foreground-muted">
        เผยแพร่ {formatThaiDate(article.publishedAt.slice(0, 10))}
      </p>

      {article.coverImageUrl && (
        <div className="relative mt-4 h-56 w-full overflow-hidden rounded-2xl bg-background-soft sm:h-72">
          <Image src={article.coverImageUrl} alt={article.title} fill className="object-cover" sizes="672px" />
        </div>
      )}

      <div
        className="prose prose-sm mt-6 max-w-none sm:prose-base prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-gold-light"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
        <Link
          href="/statistics"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          ดูสถิติเลขย้อนหลัง →
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
        >
          ตรวจผลรางวัล →
        </Link>
      </div>
    </div>
  );
}
