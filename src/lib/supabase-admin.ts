import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key — bypasses RLS.
// Never import this from a client component; the `server-only` import above
// makes that a build error if it ever happens by accident.
//
// Authorization for cart/order data isn't done via Postgres RLS here (the
// app authenticates through LINE Login/NextAuth, not Supabase Auth, so
// there's no `auth.uid()` to key policies off). Instead every function that
// uses this client takes the NextAuth session's user id explicitly and
// scopes its query to it — see src/app/actions/cart.ts.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set them in .env.local (see .env.local.example)."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
