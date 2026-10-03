import Image from "next/image";
import Link from "next/link";
import { getPublishedArticles } from "@/app/actions/articles";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { formatThaiDate } from "@/lib/draw-schedule";

export const revalidate = 300;

export const metadata = {
  title: "บทความเกี่ยวกับหวยและสถิติ | เจเคลอตเตอรี่",
  description:
    "บทความความรู้เรื่องสลากกินแบ่งรัฐบาล วิธีตรวจหวย วิธีขึ้นเงินรางวัล และสถิติหวยย้อนหลังจากข้อมูลจริง",
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6">
      <BreadcrumbJsonLd items={[{ name: "หน้าแรก", href: "/" }, { name: "บทความ", href: "/articles" }]} />

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
        <Link href="/" className="hover:text-gold-light">
          หน้าแรก
        </Link>
        <span>›</span>
        <span className="font-semibold text-foreground">บทความ</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">บทความเกี่ยวกับหวยและสถิติ</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        ความรู้เรื่องสลากกินแบ่งรัฐบาล วิธีตรวจหวย วิธีขึ้นเงินรางวัล และสถิติย้อนหลังจากข้อมูลจริง
      </p>

      {articles.length === 0 ? (
        <p className="mt-8 text-sm text-foreground-muted">ยังไม่มีบทความในขณะนี้</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/${article.slug}`}
              className="overflow-hidden rounded-2xl border border-border bg-background-card transition-colors hover:border-gold"
            >
              {article.coverImageUrl && (
                <div className="relative h-40 w-full bg-background-soft">
                  <Image
                    src={article.coverImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 50vw, 100vw"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-foreground-muted">{formatThaiDate(article.publishedAt.slice(0, 10))}</p>
                <h2 className="mt-1 text-base font-bold text-foreground">{article.title}</h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-foreground-muted">{article.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
