-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- for the "carts/orders tied to a user account" feature.
--
-- Access control note: this app authenticates customers via LINE Login
-- through NextAuth, NOT Supabase Auth — so there's no `auth.uid()` for
-- Postgres RLS policies to key off. All reads/writes to these tables go
-- through Next.js Server Actions using the Supabase SERVICE ROLE key
-- (server-only, bypasses RLS, checks the NextAuth session itself). RLS is
-- enabled here with zero policies, so the public/anon key — if it were ever
-- used from the browser — can't read or write anything by default.

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,           -- NextAuth session.user.id (LINE sub)
  ticket_id text not null,         -- matches Ticket.id from src/lib/mock-tickets.ts
  number text not null,
  price integer not null,
  qty integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, ticket_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  total_price integer not null,
  total_count integer not null,
  status text not null default 'pending', -- pending | paid | cancelled
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  ticket_id text not null,
  number text not null,
  price integer not null,
  qty integer not null
);

-- Payout info, collected so a winning customer can actually be paid —
-- one row per user, filled in on the Profile page.
create table if not exists profiles (
  user_id text primary key,        -- NextAuth session.user.id (LINE sub)
  first_name text,
  last_name text,
  phone text,
  bank_name text,                  -- e.g. "กสิกรไทย", "ไทยพาณิชย์"
  bank_account_name text,          -- name on the bank account
  bank_account_number text,
  updated_at timestamptz not null default now()
);

create index if not exists cart_items_user_id_idx on cart_items (user_id);
create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists order_items_order_id_idx on order_items (order_id);

alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table profiles enable row level security;
-- No policies added on purpose — default-deny for anon/public. The service
-- role key used by Server Actions bypasses RLS entirely.

-- Migration (2026-08-30): checkout service type — "เก็บสลากให้" (we keep the
-- physical ticket, check it, and pay out automatically, +20 บาท/ใบ) vs.
-- "จัดส่งสลากถึงบ้าน" (mail the physical ticket to the customer, +50 บาท/ใบ).
-- Run this once in the Supabase SQL editor if `orders` already exists without
-- these columns — safe to re-run, existing rows default to 'storage'/0.
alter table orders add column if not exists service_type text not null default 'storage';
alter table orders add column if not exists service_fee integer not null default 0;

-- Migration (2026-08-30): stock holds — adding a ticket to the cart reserves
-- it for HOLD_MINUTES (see src/app/actions/cart.ts). If checkout hasn't
-- happened by reserved_until, the row is deleted lazily on the next cart
-- read/write and the ticket becomes purchasable by someone else again.
alter table cart_items add column if not exists reserved_until timestamptz not null default (now() + interval '10 minutes');
create index if not exists cart_items_ticket_id_idx on cart_items (ticket_id);

-- Migration (2026-08-30): real payment — an order is now only created once a
-- customer's uploaded slip is verified via Thunder/EasySlip (see
-- src/app/actions/payment.ts). slip_ref is that API's transaction reference;
-- unique so the same real-world transfer can never be used to pay for two
-- different orders, even if two requests race each other.
alter table orders add column if not exists slip_ref text;
create unique index if not exists orders_slip_ref_idx on orders (slip_ref) where slip_ref is not null;

-- Migration (2026-08-30): "add to cart" was doing ~5 separate network
-- round-trips to Supabase one after another (release expired holds, read
-- existing qty, read other holds, read sold count, then write) — that's what
-- made it feel slow. This does the whole thing inside Postgres in a single
-- call: one round-trip in, one out, no matter how many steps it takes.
create or replace function add_to_cart(
  p_user_id text,
  p_ticket_id text,
  p_number text,
  p_price integer,
  p_ticket_quantity integer,
  p_hold_minutes integer default 10
) returns void
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_hold_until timestamptz := v_now + (p_hold_minutes || ' minutes')::interval;
  v_existing_qty integer;
  v_wanted_qty integer;
  v_held_by_others integer;
  v_sold integer;
  v_available integer;
begin
  -- Lazy cleanup, same as before — a hold past its own deadline just gets
  -- deleted on the next cart read/write anywhere, no cron job needed.
  delete from cart_items where reserved_until < v_now;

  -- Lock this user's row (if any) for this ticket so two rapid clicks on the
  -- same ticket can't both read the same starting qty and race each other.
  select qty into v_existing_qty
  from cart_items
  where user_id = p_user_id and ticket_id = p_ticket_id
  for update;

  v_wanted_qty := coalesce(v_existing_qty, 0) + 1;

  select coalesce(sum(qty), 0) into v_held_by_others
  from cart_items
  where ticket_id = p_ticket_id
    and reserved_until > v_now
    and user_id <> p_user_id;

  select coalesce(sum(qty), 0) into v_sold
  from order_items
  where ticket_id = p_ticket_id;

  v_available := p_ticket_quantity - v_held_by_others - v_sold;

  if v_wanted_qty > v_available then
    raise exception 'ขออภัย สลากเลขนี้ถูกจองหรือขายหมดแล้ว ลองเลือกเลขอื่นดูครับ';
  end if;

  insert into cart_items (user_id, ticket_id, number, price, qty, reserved_until)
  values (p_user_id, p_ticket_id, p_number, p_price, 1, v_hold_until)
  on conflict (user_id, ticket_id)
  do update set qty = v_wanted_qty, reserved_until = v_hold_until;
end;
$$;

-- Migration (2026-08-30): admin back-office — real ticket inventory (replaces
-- the hardcoded MOCK_TICKETS list in src/lib/mock-tickets.ts) and a member
-- registry (nothing was ever written to the DB on login before, so "how many
-- members" wasn't knowable). See src/app/admin/*, src/app/actions/tickets.ts,
-- src/auth.ts.
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  number text not null,               -- 6 digits
  quantity integer not null,          -- copies in this listing: 1 = หวยเดี่ยว, 2+ = หวยชุด
  price integer not null,
  is_nice_prefix boolean not null default false,
  draw_date text not null,            -- e.g. "16 กันยายน 2569" — every draw's numbers are new
  is_active boolean not null default true, -- false = an old draw, hidden from the shop
  created_at timestamptz not null default now()
);
create index if not exists tickets_is_active_idx on tickets (is_active);

create table if not exists users (
  user_id text primary key,           -- NextAuth session.user.id (LINE sub)
  name text,
  image text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

alter table tickets enable row level security;
alter table users enable row level security;
-- No policies on purpose, same as every other table here — the service role
-- key (server actions only) bypasses RLS; anon/public gets nothing.

-- One-time seed so the shop isn't empty on day one — mirrors the values that
-- used to live in MOCK_TICKETS. Safe to re-run: skipped if tickets already exist.
insert into tickets (number, quantity, price, is_nice_prefix, draw_date)
select number, quantity, price, is_nice_prefix, '1 กันยายน 2569'
from (values
  ('452784', 2, 80, false),
  ('816743', 1, 80, false),
  ('004661', 1, 80, false),
  ('111287', 3, 80, true),
  ('222905', 4, 80, true),
  ('333410', 1, 80, true),
  ('678903', 1, 80, false),
  ('912456', 2, 80, false),
  ('123458', 1, 80, true),
  ('789012', 1, 80, true),
  ('045632', 5, 80, false),
  ('998271', 1, 80, false)
) as seed(number, quantity, price, is_nice_prefix)
where not exists (select 1 from tickets);

-- Migration (2026-08-30): ticket photos — admin can attach a real photo of
-- the physical ticket per listing instead of everything showing the same
-- placeholder image everywhere.
alter table tickets add column if not exists image_url text;

-- Public storage bucket so uploaded photos are viewable via a plain URL on
-- the shop pages — uploads only ever go through the service-role client
-- (admin actions), so no public write policy is needed, just public read
-- (which the bucket's own `public = true` flag already grants).
insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', true)
on conflict (id) do nothing;

-- Migration (2026-09-01): lottery number statistics — a real historical
-- results table backed by real data (see src/app/actions/lottery.ts,
-- src/lib/lottery-stats.ts, /statistics, /number/[number], /results). One
-- row per real past draw; historical rows are backfilled once from a public
-- API, new draws going forward are added through /admin/draws.
create table if not exists lottery_draws (
  id uuid primary key default gen_random_uuid(),
  draw_date date not null,             -- real calendar date — lets year/month filtering work later
  draw_date_thai text not null,        -- display string, e.g. "1 กันยายน 2569"
  first_prize text not null,           -- 6 digits
  last2 text not null,                 -- เลขท้าย 2 ตัว
  front3 text[] not null,              -- เลขหน้า 3 ตัว (2 numbers)
  back3 text[] not null,               -- เลขท้าย 3 ตัว (2 numbers)
  source text not null default 'manual', -- 'import' | 'manual' — where the row came from
  created_at timestamptz not null default now(),
  unique (draw_date)
);
create index if not exists lottery_draws_draw_date_idx on lottery_draws (draw_date desc);

alter table lottery_draws enable row level security;
-- No policies on purpose, same as every other table here — the service
-- role key (server actions only) bypasses RLS; anon/public gets nothing.

-- Migration (2026-09-06): full prize breakdown — near-first prize and
-- 2nd–5th prizes, so /results/[date] can show a complete "ตรวจหวย" page
-- (every prize tier, not just the four headline categories from Phase 1),
-- and the ticket checker can match a number against every tier that can
-- actually win. Nullable/no default since existing rows don't have this
-- yet until the backfill script re-runs; going forward every draw (manual
-- or the GLO auto-fetch button) fills them in.
alter table lottery_draws
  add column if not exists near1 text[],   -- รางวัลข้างเคียงรางวัลที่ 1 (2 numbers)
  add column if not exists second text[],  -- รางวัลที่ 2 (5 numbers)
  add column if not exists third text[],   -- รางวัลที่ 3 (10 numbers)
  add column if not exists fourth text[],  -- รางวัลที่ 4 (50 numbers)
  add column if not exists fifth text[];   -- รางวัลที่ 5 (100 numbers)

-- Migration (2026-09-06): scheduled auto-fetch + one-click confirm. A cron
-- job (see src/app/api/cron/fetch-draw) hits the official GLO API shortly
-- after each draw's ~14:30 announcement and inserts the result itself —
-- but as 'pending', not 'confirmed', so it never goes live unread. Public
-- reads (getAllDraws/getLatestDraw/getDrawByDate) only ever return
-- 'confirmed' rows; the admin sees pending ones in /admin/draws and either
-- clicks "ยืนยันและเผยแพร่" as-is (confirmDraw) or edits first (updateDraw
-- always sets status back to 'confirmed', since submitting that form IS
-- the review). Manual entries (createDraw) are confirmed immediately —
-- typing it in and saving already is the review step.
alter table lottery_draws
  add column if not exists status text not null default 'confirmed';
create index if not exists lottery_draws_status_idx on lottery_draws (status);

-- Migration (2026-09-06): articles/blog system. Content is stored as HTML
-- straight from the TipTap WYSIWYG editor in /admin/articles (no markdown
-- involved) — admin-authored only, same trust model as every other
-- admin-entered field in this app, so it's rendered with
-- dangerouslySetInnerHTML on the public page with no sanitizer.
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,                  -- HTML from the TipTap editor
  cover_image_url text,
  status text not null default 'draft',   -- 'draft' | 'published'
  published_at timestamptz,               -- set once, on first publish; stays stable after
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_slug_idx on articles (slug);
create index if not exists articles_status_published_idx on articles (status, published_at desc);
alter table articles enable row level security;

-- One bucket for both cover images and in-body images uploaded through the
-- editor's "แทรกรูปภาพ" toolbar button — same public-bucket pattern as
-- ticket-photos.
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;
