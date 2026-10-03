import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

// LINE Login (OAuth) for customer sign-in. No database — sessions are plain
// JWT cookies, so there's no server-side user ledger or order history tied
// to an account yet, just "who is currently signed in" for this browser.
// Needs AUTH_LINE_ID / AUTH_LINE_SECRET (and AUTH_SECRET) in .env.local —
// see the setup note left in .env.local.example.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
      // Explicit scope: "profile" is what gets us the display name + profile
      // picture. Leaving out "email" — this channel doesn't have that
      // permission approved yet (see LINE Login channel → OpenID Connect).
      authorization: { params: { scope: "profile openid" } },
    }),
  ],
  session: { strategy: "jwt" },
  // Behind a reverse proxy (ngrok, etc.) — trust its Host/X-Forwarded-* headers
  // instead of assuming localhost, so callback URLs are built correctly.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in `user` comes from the provider's profile mapping
      // (defaultProfile → { image: profile.picture, ... }). Persist it onto
      // the token explicitly so it survives regardless of default-callback
      // behavior once we override `session` below.
      if (user) {
        if (user.image) token.picture = user.image;
        if (user.name) token.name = user.name;
      }
      // IMPORTANT: without a database adapter, Auth.js auto-generates a
      // random UUID for `user.id` (and so `token.sub`) on every sign-in —
      // it is NOT stable across logins/devices for the same LINE account.
      // The actual stable, permanent LINE user id ends up in
      // `account.providerAccountId` instead (mapped from the ID token's
      // `sub` claim), available only on this first-sign-in call — so we
      // overwrite `token.sub` with it here, and it then rides along
      // unchanged in the encrypted JWT on every later request.
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;

        // Member registry — nothing was ever written to the DB on login
        // before, so admin had no way to know how many members exist. This
        // only runs on a real sign-in (account is only present then), never
        // on every request, so it's cheap.
        try {
          await supabaseAdmin()
            .from("users")
            .upsert(
              {
                user_id: account.providerAccountId,
                name: user?.name ?? null,
                image: user?.image ?? null,
                last_login_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
        } catch (err) {
          // Never block sign-in over this — worst case is a missed member
          // record, not a broken login.
          console.error("บันทึกข้อมูลสมาชิกไม่สำเร็จ:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (typeof token.picture === "string") session.user.image = token.picture;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
});
