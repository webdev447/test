import { getAdminArticles } from "@/app/actions/articles";
import ArticlesManager from "@/components/admin/ArticlesManager";

export default async function AdminArticlesPage() {
  const articles = await getAdminArticles();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">บทความ</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        ทั้งหมด {articles.length.toLocaleString("th-TH")} บทความ
      </p>
      <div className="mt-5">
        <ArticlesManager initialArticles={articles} />
      </div>
    </div>
  );
}
