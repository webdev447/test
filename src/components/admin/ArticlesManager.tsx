"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  createArticle,
  deleteArticle,
  getAdminArticles,
  updateArticle,
  uploadArticleImage,
  type AdminArticle,
  type ArticleInput,
} from "@/app/actions/articles";
import RichTextEditor from "@/components/admin/RichTextEditor";

const EMPTY_FORM: ArticleInput = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: null,
  status: "draft",
};

const PAGE_SIZE = 20;

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ArticlesManager({ initialArticles }: { initialArticles: AdminArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [form, setForm] = useState<ArticleInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [page, setPage] = useState(1);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const data = await getAdminArticles();
    setArticles(data);
  }

  function startEdit(article: AdminArticle) {
    setEditingId(article.id);
    setSlugTouched(true);
    setForm({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      coverImageUrl: article.coverImageUrl,
      status: article.status as "draft" | "published",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setSlugTouched(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await updateArticle(editingId, form);
      } else {
        await createArticle(form);
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(article: AdminArticle) {
    if (!window.confirm(`ลบบทความ "${article.title}" ใช่ไหม?`)) return;
    await deleteArticle(article.id);
    await refresh();
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsUploadingCover(true);
      try {
        const url = await uploadArticleImage(reader.result as string);
        setForm((prev) => ({ ...prev, coverImageUrl: url }));
      } catch (err) {
        console.error("อัปโหลดรูปหน้าปกไม่สำเร็จ:", err);
      } finally {
        setIsUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageArticles = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-background-card p-5 shadow-sm shadow-blue-950/5"
      >
        <h2 className="text-sm font-semibold text-foreground">
          {editingId ? "แก้ไขบทความ" : "เขียนบทความใหม่"}
        </h2>

        <div>
          <label className="text-xs font-medium text-foreground-muted">หัวข้อบทความ</label>
          <input
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((prev) => ({
                ...prev,
                title,
                slug: slugTouched ? prev.slug : slugify(title),
              }));
            }}
            required
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">
            slug (URL: /articles/...)
          </label>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm({ ...form, slug: e.target.value });
            }}
            required
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tracking-wide focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">คำโปรยสั้นๆ (แสดงในลิสต์/meta description)</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            required
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">รูปหน้าปก</label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
            className="hidden"
          />
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-background"
            >
              {form.coverImageUrl ? (
                <Image src={form.coverImageUrl} alt="" fill className="object-cover" sizes="112px" />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] text-foreground-muted">
                  {isUploadingCover ? "..." : "+ รูปหน้าปก"}
                </span>
              )}
            </button>
            {form.coverImageUrl && (
              <button
                type="button"
                onClick={() => setForm({ ...form, coverImageUrl: null })}
                className="text-xs font-medium text-danger hover:underline"
              >
                ลบรูปหน้าปก
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">เนื้อหาบทความ</label>
          <div className="mt-1">
            <RichTextEditor
              key={editingId ?? "new"}
              value={form.content}
              onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground-muted">สถานะ</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 sm:w-56"
          >
            <option value="draft">ฉบับร่าง (ยังไม่เผยแพร่)</option>
            <option value="published">เผยแพร่</option>
          </select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-gold flex-1 rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {isSaving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "+ เพิ่มบทความนี้"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {pageArticles.map((article) => (
          <div
            key={article.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background-card p-3 text-sm"
          >
            {article.coverImageUrl && (
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-background-soft">
                <Image src={article.coverImageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
            )}
            <span className="font-semibold text-foreground">{article.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                article.status === "published"
                  ? "bg-success/10 text-success"
                  : "bg-background-soft text-foreground-muted"
              }`}
            >
              {article.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
            </span>

            <span className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(article)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => handleDelete(article)}
                className="rounded-full border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
              >
                ลบ
              </button>
            </span>
          </div>
        ))}

        {articles.length === 0 && (
          <p className="text-sm text-foreground-muted">ยังไม่มีบทความ เขียนบทความแรกด้านบนได้เลย</p>
        )}

        {articles.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
            <span className="text-xs text-foreground-muted">
              บทความที่ {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, articles.length)} จากทั้งหมด {articles.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-gold hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
