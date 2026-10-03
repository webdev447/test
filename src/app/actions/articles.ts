"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminUserId } from "@/lib/admin-auth";

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!isAdminUserId(userId)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงส่วนนี้");
  }
  return userId as string;
}

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  publishedAt: string;
};

export type Article = ArticleSummary & {
  id: string;
  content: string;
  updatedAt: string;
};

export type AdminArticle = Article & { status: string };

const SUMMARY_COLUMNS = "slug, title, excerpt, cover_image_url, published_at";
const FULL_COLUMNS = `id, ${SUMMARY_COLUMNS}, content, updated_at`;

function mapSummary(row: {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string;
}): ArticleSummary {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    publishedAt: row.published_at,
  };
}

function mapFull(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string;
  content: string;
  updated_at: string;
}): Article {
  return { ...mapSummary(row), id: row.id, content: row.content, updatedAt: row.updated_at };
}

// Public read — lightweight columns only (no `content`, which can be a long
// HTML blob) for the /articles list page. Only ever 'published' rows.
export async function getPublishedArticles(limit = 100): Promise<ArticleSummary[]> {
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapSummary);
}

// Public read — one full article by slug, for /articles/[slug]. Returns
// null for a draft or nonexistent slug — same status-gating pattern as
// getDrawByDate in src/app/actions/lottery.ts.
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data ? mapFull(data) : null;
}

// ===== Admin: manage articles (src/app/admin/articles) =====

export type ArticleInput = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  status: "draft" | "published";
};

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAdminArticles(): Promise<AdminArticle[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(`${FULL_COLUMNS}, status`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...mapFull(row), status: row.status }));
}

export async function createArticle(input: ArticleInput): Promise<void> {
  await requireAdmin();
  if (!input.title.trim()) throw new Error("กรุณาระบุหัวข้อบทความ");
  if (!input.excerpt.trim()) throw new Error("กรุณาระบุคำโปรยสั้นๆ");
  if (!input.content.trim()) throw new Error("กรุณาใส่เนื้อหาบทความ");

  const slug = input.slug.trim() || slugify(input.title);
  if (!slug) throw new Error("กรุณาระบุ slug (URL) ของบทความ");

  const { data: existing, error: existingError } = await supabaseAdmin()
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error("มี slug นี้อยู่แล้ว กรุณาเปลี่ยน");

  const { error } = await supabaseAdmin()
    .from("articles")
    .insert({
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content,
      cover_image_url: input.coverImageUrl,
      status: input.status,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    });
  if (error) {
    if (error.code === "23505") throw new Error("มี slug นี้อยู่แล้ว กรุณาเปลี่ยน");
    throw error;
  }
}

export async function updateArticle(id: string, input: ArticleInput): Promise<void> {
  await requireAdmin();
  if (!input.title.trim()) throw new Error("กรุณาระบุหัวข้อบทความ");
  if (!input.excerpt.trim()) throw new Error("กรุณาระบุคำโปรยสั้นๆ");
  if (!input.content.trim()) throw new Error("กรุณาใส่เนื้อหาบทความ");

  const slug = input.slug.trim() || slugify(input.title);
  if (!slug) throw new Error("กรุณาระบุ slug (URL) ของบทความ");

  const db = supabaseAdmin();

  // Only stamp published_at the first time a row transitions to
  // 'published' — later edits (even while already published) must never
  // move it, since that date is what /articles and the sitemap show.
  const { data: current, error: currentError } = await db
    .from("articles")
    .select("status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (currentError) throw currentError;

  const publishedAt =
    input.status === "published"
      ? (current?.published_at ?? new Date().toISOString())
      : null;

  const { error } = await db
    .from("articles")
    .update({
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content,
      cover_image_url: input.coverImageUrl,
      status: input.status,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("มี slug นี้อยู่แล้ว กรุณาเปลี่ยน");
    throw error;
  }
}

export async function deleteArticle(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin().from("articles").delete().eq("id", id);
  if (error) throw error;
}

// Uploads one image (cover or an in-body image inserted via the editor's
// "แทรกรูปภาพ" toolbar button) to the article-images bucket and returns its
// public URL. Deliberately takes no articleId — both call sites can happen
// before the article row exists yet, same as picking a photo mid-draft in
// any blog editor.
export async function uploadArticleImage(imageBase64: string): Promise<string> {
  await requireAdmin();
  const db = supabaseAdmin();

  const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("รูปภาพไม่ถูกต้อง");
  const [, mimeType, base64Data] = match;
  const extension = mimeType.split("/")[1] ?? "jpg";
  const buffer = Buffer.from(base64Data, "base64");

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error: uploadError } = await db.storage
    .from("article-images")
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = db.storage.from("article-images").getPublicUrl(path);

  return publicUrl;
}
