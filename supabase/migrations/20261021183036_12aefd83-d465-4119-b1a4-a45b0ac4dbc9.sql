alter table public.store_settings
  add column if not exists banner_url text,
  add column if not exists opening_hours text,
  add column if not exists min_order numeric default 0,
  add column if not exists delivery_fee numeric default 0;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_no text not null,
  customer_name text not null,
  address text,
  notes text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);
alter table public.store_orders enable row level security;
grant select, insert, update, delete on public.store_orders to authenticated;
grant insert on public.store_orders to anon;
create policy "owner manages orders" on public.store_orders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public creates order on published store" on public.store_orders for insert to anon, authenticated
  with check (exists (select 1 from public.store_settings s where s.user_id = store_orders.user_id and s.is_published) and char_length(customer_name) between 1 and 100 and jsonb_array_length(items) between 1 and 200);