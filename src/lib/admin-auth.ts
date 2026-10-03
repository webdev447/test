// Who can see /admin — a small comma-separated allow-list of LINE user ids
// in .env.local, since there's no separate admin login system. Lives outside
// any "use server" file since those may only export async functions.
const ADMIN_USER_IDS = (process.env.ADMIN_LINE_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdminUserId(userId: string | null | undefined): boolean {
  return !!userId && ADMIN_USER_IDS.includes(userId);
}
