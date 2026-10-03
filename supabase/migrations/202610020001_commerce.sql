begin;

create table if not exists public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_key uuid not null,
  request_fingerprint text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  product_slug text not null,
  product_title text not null,
  amount integer not null check (amount > 0),
  currency text not null default 'KRW' check (currency = 'KRW'),
  payment_method text not null check (payment_method in ('card', 'kakaopay')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  delivery jsonb not null check (jsonb_typeof(delivery) = 'object'),
  status text not null default 'created' check (status in ('created','authorizing','paid','failed','expired','cancelled','cancel_pending','partial_cancelled','review')),
  gateway_tid text,
  balance_amount integer,
  receipt_url text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_requested boolean not null default false,
  failure_code text,
  failure_message text,
  last_checked_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, environment, request_key),
  unique (environment, gateway_tid)
);
create index if not exists commerce_orders_user_created_idx on public.commerce_orders (user_id, environment, created_at desc);
create index if not exists commerce_orders_product_idx on public.commerce_orders (user_id, environment, product_slug, status);

create table if not exists public.commerce_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  environment text not null check (environment in ('sandbox', 'production')),
  product_slug text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  delivery jsonb not null,
  status text not null check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_subscriptions_user_idx on public.commerce_subscriptions (user_id, environment, start_date desc);

-- Only the authenticated application server can read/write commerce data.
-- End-user ownership is checked against Supabase getUser() in every application API.
alter table public.commerce_orders enable row level security;
alter table public.commerce_subscriptions enable row level security;
revoke all on public.commerce_orders, public.commerce_subscriptions from anon, authenticated;
grant all on public.commerce_orders, public.commerce_subscriptions to service_role;

create or replace function public.commerce_create_order(
  p_user_id uuid, p_request_key uuid, p_fingerprint text, p_environment text,
  p_slug text, p_title text, p_amount integer, p_method text, p_start_date date, p_end_date date, p_delivery jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.commerce_orders;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || p_environment || p_slug, 0));
  select * into v_order from public.commerce_orders where user_id = p_user_id and environment = p_environment and request_key = p_request_key;
  if found then
    if v_order.request_fingerprint <> p_fingerprint then raise exception 'idempotency_conflict'; end if;
    return to_jsonb(v_order);
  end if;
  if exists (select 1 from public.commerce_subscriptions where user_id = p_user_id and environment = p_environment and product_slug = p_slug
    and status in ('active','paused') and start_date <= p_end_date and end_date >= p_start_date) then raise exception 'subscription_overlap'; end if;
  if exists (select 1 from public.commerce_orders where user_id = p_user_id and environment = p_environment and product_slug = p_slug
    and ((status = 'created' and expires_at > now()) or status in ('authorizing','cancel_pending','review'))
    and start_date <= p_end_date and end_date >= p_start_date) then raise exception 'pending_order'; end if;
  insert into public.commerce_orders (user_id, request_key, request_fingerprint, environment, product_slug, product_title, amount, payment_method, start_date, end_date, delivery)
    values (p_user_id, p_request_key, p_fingerprint, p_environment, p_slug, p_title, p_amount, p_method, p_start_date, p_end_date, p_delivery) returning * into v_order;
  return to_jsonb(v_order);
end $$;

create or replace function public.commerce_claim_order(p_order_id uuid, p_tid text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.commerce_orders;
begin
  select * into v_order from public.commerce_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.gateway_tid is not null and v_order.gateway_tid <> p_tid then raise exception 'transaction_conflict'; end if;
  if v_order.status <> 'created' then return jsonb_build_object('claimed', false, 'order', to_jsonb(v_order)); end if;
  if v_order.expires_at <= now() then
    update public.commerce_orders set status = 'expired', updated_at = now() where id = p_order_id returning * into v_order;
    return jsonb_build_object('claimed', false, 'order', to_jsonb(v_order));
  end if;
  update public.commerce_orders set status = 'authorizing', gateway_tid = p_tid, updated_at = now() where id = p_order_id returning * into v_order;
  return jsonb_build_object('claimed', true, 'order', to_jsonb(v_order));
end $$;

create or replace function public.commerce_request_cancel(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.commerce_orders;
begin
  select * into v_order from public.commerce_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'cancelled' then return to_jsonb(v_order); end if;
  update public.commerce_orders set cancel_requested = true, status = 'cancel_pending', updated_at = now() where id = p_order_id returning * into v_order;
  update public.commerce_subscriptions set status = 'paused', updated_at = now() where order_id = p_order_id;
  return to_jsonb(v_order);
end $$;

create or replace function public.commerce_apply_payment(
  p_order_id uuid, p_tid text, p_amount integer, p_state text, p_balance integer,
  p_receipt text, p_paid_at timestamptz, p_cancelled_at timestamptz, p_code text, p_message text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.commerce_orders; v_state text;
begin
  select * into v_order from public.commerce_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.amount <> p_amount or (v_order.gateway_tid is not null and v_order.gateway_tid <> p_tid) then raise exception 'transaction_conflict'; end if;
  if p_state not in ('paid','failed','expired','cancelled','partial_cancelled','authorizing') then raise exception 'invalid_payment_state'; end if;
  -- Late/replayed approval responses must never restore cancelled entitlements.
  if v_order.status = 'cancelled' or (v_order.status = 'partial_cancelled' and p_state <> 'cancelled')
    or (v_order.status = 'paid' and p_state in ('failed','expired','authorizing')) then return to_jsonb(v_order); end if;
  v_state := case when v_order.cancel_requested and p_state in ('paid','authorizing') then 'cancel_pending' else p_state end;
  update public.commerce_orders set status = v_state, gateway_tid = p_tid, balance_amount = p_balance,
    receipt_url = coalesce(p_receipt, receipt_url), paid_at = coalesce(p_paid_at, paid_at), cancelled_at = coalesce(p_cancelled_at, cancelled_at),
    failure_code = p_code, failure_message = p_message, last_checked_at = now(), updated_at = now()
    where id = p_order_id returning * into v_order;
  if v_state = 'paid' then
    insert into public.commerce_subscriptions (order_id, user_id, environment, product_slug, start_date, end_date, delivery, status)
      values (v_order.id, v_order.user_id, v_order.environment, v_order.product_slug, v_order.start_date, v_order.end_date, v_order.delivery, 'active')
      on conflict (order_id) do nothing;
  elsif v_state in ('cancelled','failed','expired') then
    update public.commerce_subscriptions set status = 'cancelled', updated_at = now() where order_id = p_order_id;
  elsif v_state in ('partial_cancelled','cancel_pending') then
    update public.commerce_subscriptions set status = 'paused', updated_at = now() where order_id = p_order_id;
  end if;
  return to_jsonb(v_order);
end $$;

revoke all on function public.commerce_create_order(uuid,uuid,text,text,text,text,integer,text,date,date,jsonb) from public, anon, authenticated;
revoke all on function public.commerce_claim_order(uuid,text) from public, anon, authenticated;
revoke all on function public.commerce_request_cancel(uuid) from public, anon, authenticated;
revoke all on function public.commerce_apply_payment(uuid,text,integer,text,integer,text,timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.commerce_create_order(uuid,uuid,text,text,text,text,integer,text,date,date,jsonb) to service_role;
grant execute on function public.commerce_claim_order(uuid,text) to service_role;
grant execute on function public.commerce_request_cancel(uuid) to service_role;
grant execute on function public.commerce_apply_payment(uuid,text,integer,text,integer,text,timestamptz,timestamptz,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
