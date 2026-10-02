-- HAYPOP Supabase foundation
-- PostgreSQL source of truth. Apply this migration in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'kasir');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text unique not null,
  role public.app_role not null default 'kasir',
  avatar_color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(14,2) not null default 0 check (price >= 0),
  stock numeric(14,3) not null default 0 check (stock >= 0),
  unit text not null,
  image text,
  description text,
  modifier_groups jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  invoice_number text not null unique,
  cashier_id uuid not null references public.profiles(id),
  cashier_name text not null,
  timestamp timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  payment_method text not null,
  amount_paid numeric(14,2) not null default 0,
  change numeric(14,2) not null default 0,
  customer_id uuid references public.customers(id),
  customer_snapshot jsonb,
  is_synced boolean not null default true,
  sync_timestamp timestamptz,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id text primary key,
  date date not null,
  category text not null,
  category_label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  recorded_by uuid references public.profiles(id),
  recorded_by_name text,
  timestamp timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index transactions_cashier_id_idx on public.transactions(cashier_id);
create index transactions_timestamp_idx on public.transactions(timestamp desc);
create index expenses_date_idx on public.expenses(date desc);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_write"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "categories_active_read"
on public.categories for select
to authenticated
using (public.is_active_user());

create policy "categories_admin_write"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "suppliers_admin_all"
on public.suppliers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "customers_active_read"
on public.customers for select
to authenticated
using (public.is_active_user());

create policy "customers_admin_write"
on public.customers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "products_active_read"
on public.products for select
to authenticated
using (public.is_active_user());

create policy "products_admin_write"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "transactions_read_own_or_admin"
on public.transactions for select
to authenticated
using (public.is_active_user() and (cashier_id = auth.uid() or public.is_admin()));

create policy "transactions_insert_own"
on public.transactions for insert
to authenticated
with check (public.is_active_user() and cashier_id = auth.uid());

create policy "transactions_admin_update"
on public.transactions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "transactions_admin_delete"
on public.transactions for delete
to authenticated
using (public.is_admin());

create policy "expenses_admin_all"
on public.expenses for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "settings_active_read"
on public.settings for select
to authenticated
using (public.is_active_user());

create policy "settings_admin_write"
on public.settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "audit_logs_admin_read"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create policy "audit_logs_insert_authenticated"
on public.audit_logs for insert
to authenticated
with check (actor_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, new.id::text), '@', 1)),
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, new.id::text), '@', 1))),
    case
      when (new.raw_user_meta_data ->> 'role') = 'admin' then 'admin'::public.app_role
      else 'kasir'::public.app_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Bootstrap helper: run manually after creating the first Auth user.
-- update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID';
