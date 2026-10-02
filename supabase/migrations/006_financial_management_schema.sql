-- HAYPOP financial management foundation
-- Management-focused finance model: money accounts, movements, supplier payables,
-- customer receivables, transfers, asset purchases, and owner withdrawals.
-- No formal double-entry ledger, opening balances, tax, depreciation, BOM, or refunds.

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('cash', 'bank', 'qris', 'ewallet')),
  payment_method_code text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.financial_accounts(id),
  entry_type text not null check (
    entry_type in (
      'sale',
      'expense',
      'asset_purchase',
      'supplier_payment',
      'customer_payment',
      'transfer',
      'prive',
      'adjustment'
    )
  ),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  reference_type text,
  reference_id text,
  entry_date timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.financial_transfers (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references public.financial_accounts(id),
  to_account_id uuid not null references public.financial_accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  transfer_date timestamptz not null default now(),
  description text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create table public.supplier_payables (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  reference_number text,
  description text,
  total_amount numeric(14,2) not null check (total_amount > 0),
  due_date date,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references public.supplier_payables(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.customer_receivables (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  transaction_id text references public.transactions(id),
  reference_number text,
  total_amount numeric(14,2) not null check (total_amount > 0),
  due_date date,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.customer_receivables(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.asset_purchases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  purchase_date date not null default current_date,
  account_id uuid references public.financial_accounts(id),
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index financial_entries_account_date_idx
  on public.financial_entries(account_id, entry_date desc);

create index financial_entries_reference_idx
  on public.financial_entries(reference_type, reference_id);

create index financial_transfers_date_idx
  on public.financial_transfers(transfer_date desc);

create index supplier_payables_supplier_status_idx
  on public.supplier_payables(supplier_id, status);

create index supplier_payments_payable_date_idx
  on public.supplier_payments(payable_id, payment_date desc);

create index customer_receivables_customer_status_idx
  on public.customer_receivables(customer_id, status);

create index customer_payments_receivable_date_idx
  on public.customer_payments(receivable_id, payment_date desc);

create index asset_purchases_date_idx
  on public.asset_purchases(purchase_date desc);

alter table public.financial_accounts enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_transfers enable row level security;
alter table public.supplier_payables enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.customer_receivables enable row level security;
alter table public.customer_payments enable row level security;
alter table public.asset_purchases enable row level security;

create policy "financial_accounts_active_read"
on public.financial_accounts for select
to authenticated
using (public.is_active_user());

create policy "financial_accounts_admin_write"
on public.financial_accounts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "financial_entries_admin_read"
on public.financial_entries for select
to authenticated
using (public.is_admin());

create policy "financial_transfers_admin_all"
on public.financial_transfers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "supplier_payables_admin_all"
on public.supplier_payables for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "supplier_payments_admin_all"
on public.supplier_payments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "customer_receivables_admin_all"
on public.customer_receivables for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "customer_payments_admin_all"
on public.customer_payments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "asset_purchases_admin_all"
on public.asset_purchases for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on table public.financial_accounts, public.financial_entries,
  public.financial_transfers, public.supplier_payables, public.supplier_payments,
  public.customer_receivables, public.customer_payments, public.asset_purchases
  from anon;

revoke all on table public.financial_accounts, public.financial_entries,
  public.financial_transfers, public.supplier_payables, public.supplier_payments,
  public.customer_receivables, public.customer_payments, public.asset_purchases
  from authenticated;

grant select on table public.financial_accounts to authenticated;
grant select, insert, update, delete on table public.financial_accounts to authenticated;
grant select on table public.financial_entries to authenticated;
grant select, insert, update, delete on table public.financial_transfers to authenticated;
grant select, insert, update, delete on table public.supplier_payables to authenticated;
grant select, insert, update, delete on table public.supplier_payments to authenticated;
grant select, insert, update, delete on table public.customer_receivables to authenticated;
grant select, insert, update, delete on table public.customer_payments to authenticated;
grant select, insert, update, delete on table public.asset_purchases to authenticated;

comment on table public.financial_accounts is
  'Where HAYPOP money is held: cash, bank, QRIS, or e-wallet. No opening balance is stored.';
comment on table public.financial_entries is
  'Immutable money movement ledger used for management reporting; not formal double-entry accounting.';
comment on table public.financial_transfers is
  'Movement between HAYPOP money accounts; transfers do not change total money.';
comment on table public.supplier_payables is
  'Supplier obligations that may be settled through multiple installments.';
comment on table public.customer_receivables is
  'Customer credit balances that may be collected through multiple installments.';
comment on table public.asset_purchases is
  'Asset spending tracked separately from operating expenses; no depreciation model.';
