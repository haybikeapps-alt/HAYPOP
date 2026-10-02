-- HAYPOP financial transaction hardening
-- Adds secure RPCs for money movement and installment payments.
-- Direct writes to financial movement tables are intentionally restricted;
-- application code should use these RPCs so balances, overpayments, and
-- related ledger entries are handled atomically.

create unique index if not exists customer_receivables_transaction_uidx
  on public.customer_receivables(transaction_id)
  where transaction_id is not null;

create or replace function public.financial_account_balance(
  p_account_id uuid
)
returns numeric(14,2)
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(
    case
      when direction = 'in' then amount
      else -amount
    end
  ), 0)::numeric(14,2)
  from public.financial_entries
  where account_id = p_account_id;
$$;

revoke all on function public.financial_account_balance(uuid) from public;
grant execute on function public.financial_account_balance(uuid) to authenticated;

create or replace function public.create_financial_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_transfer_date timestamptz default now(),
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer_id uuid;
  v_balance numeric(14,2);
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'Source and destination accounts must differ';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.financial_accounts
    where id = p_from_account_id
      and is_active
  ) then
    raise exception 'Source account is not active';
  end if;

  if not exists (
    select 1
    from public.financial_accounts
    where id = p_to_account_id
      and is_active
  ) then
    raise exception 'Destination account is not active';
  end if;

  v_balance := public.financial_account_balance(p_from_account_id);

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into public.financial_transfers (
    from_account_id,
    to_account_id,
    amount,
    transfer_date,
    description,
    created_by
  )
  values (
    p_from_account_id,
    p_to_account_id,
    p_amount,
    coalesce(p_transfer_date, now()),
    p_description,
    v_user_id
  )
  returning id into v_transfer_id;

  insert into public.financial_entries (
    account_id,
    entry_type,
    direction,
    amount,
    description,
    reference_type,
    reference_id,
    entry_date,
    created_by
  )
  values
    (
      p_from_account_id,
      'transfer',
      'out',
      p_amount,
      p_description,
      'financial_transfer',
      v_transfer_id::text,
      coalesce(p_transfer_date, now()),
      v_user_id
    ),
    (
      p_to_account_id,
      'transfer',
      'in',
      p_amount,
      p_description,
      'financial_transfer',
      v_transfer_id::text,
      coalesce(p_transfer_date, now()),
      v_user_id
    );

  return v_transfer_id;
end;
$$;

revoke all on function public.create_financial_transfer(uuid, uuid, numeric, timestamptz, text) from public;
grant execute on function public.create_financial_transfer(uuid, uuid, numeric, timestamptz, text) to authenticated;

create or replace function public.record_supplier_payment(
  p_payable_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_payment_date timestamptz default now(),
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_user_id uuid;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_balance numeric(14,2);
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and is_active
  ) then
    raise exception 'Payment account is not active';
  end if;

  select total_amount
    into v_total
  from public.supplier_payables
  where id = p_payable_id
  for update;

  if v_total is null then
    raise exception 'Supplier payable not found';
  end if;

  select coalesce(sum(amount), 0)
    into v_paid
  from public.supplier_payments
  where payable_id = p_payable_id;

  if v_paid + p_amount > v_total then
    raise exception 'Payment exceeds outstanding supplier payable';
  end if;

  v_balance := public.financial_account_balance(p_account_id);

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into public.supplier_payments (
    payable_id,
    account_id,
    amount,
    payment_date,
    notes,
    created_by
  )
  values (
    p_payable_id,
    p_account_id,
    p_amount,
    coalesce(p_payment_date, now()),
    p_notes,
    v_user_id
  )
  returning id into v_payment_id;

  insert into public.financial_entries (
    account_id,
    entry_type,
    direction,
    amount,
    description,
    reference_type,
    reference_id,
    entry_date,
    created_by
  )
  values (
    p_account_id,
    'supplier_payment',
    'out',
    p_amount,
    p_notes,
    'supplier_payment',
    v_payment_id::text,
    coalesce(p_payment_date, now()),
    v_user_id
  );

  update public.supplier_payables
  set status = case
    when v_paid + p_amount = v_total then 'paid'
    else 'partial'
  end,
  updated_at = now()
  where id = p_payable_id;

  return v_payment_id;
end;
$$;

revoke all on function public.record_supplier_payment(uuid, uuid, numeric, timestamptz, text) from public;
grant execute on function public.record_supplier_payment(uuid, uuid, numeric, timestamptz, text) to authenticated;

create or replace function public.record_customer_payment(
  p_receivable_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_payment_date timestamptz default now(),
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_user_id uuid;
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and is_active
  ) then
    raise exception 'Payment account is not active';
  end if;

  select total_amount
    into v_total
  from public.customer_receivables
  where id = p_receivable_id
  for update;

  if v_total is null then
    raise exception 'Customer receivable not found';
  end if;

  select coalesce(sum(amount), 0)
    into v_paid
  from public.customer_payments
  where receivable_id = p_receivable_id;

  if v_paid + p_amount > v_total then
    raise exception 'Payment exceeds outstanding customer receivable';
  end if;

  insert into public.customer_payments (
    receivable_id,
    account_id,
    amount,
    payment_date,
    notes,
    created_by
  )
  values (
    p_receivable_id,
    p_account_id,
    p_amount,
    coalesce(p_payment_date, now()),
    p_notes,
    v_user_id
  )
  returning id into v_payment_id;

  insert into public.financial_entries (
    account_id,
    entry_type,
    direction,
    amount,
    description,
    reference_type,
    reference_id,
    entry_date,
    created_by
  )
  values (
    p_account_id,
    'customer_payment',
    'in',
    p_amount,
    p_notes,
    'customer_payment',
    v_payment_id::text,
    coalesce(p_payment_date, now()),
    v_user_id
  );

  update public.customer_receivables
  set status = case
    when v_paid + p_amount = v_total then 'paid'
    else 'partial'
  end,
  updated_at = now()
  where id = p_receivable_id;

  return v_payment_id;
end;
$$;

revoke all on function public.record_customer_payment(uuid, uuid, numeric, timestamptz, text) from public;
grant execute on function public.record_customer_payment(uuid, uuid, numeric, timestamptz, text) to authenticated;

create or replace function public.record_asset_purchase(
  p_name text,
  p_amount numeric,
  p_account_id uuid,
  p_purchase_date date default current_date,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Asset name is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Asset purchase amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and is_active
  ) then
    raise exception 'Payment account is not active';
  end if;

  if public.financial_account_balance(p_account_id) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into public.asset_purchases (
    name,
    amount,
    purchase_date,
    account_id,
    description,
    created_by
  )
  values (
    trim(p_name),
    p_amount,
    coalesce(p_purchase_date, current_date),
    p_account_id,
    p_description,
    v_user_id
  )
  returning id into v_asset_id;

  insert into public.financial_entries (
    account_id,
    entry_type,
    direction,
    amount,
    description,
    reference_type,
    reference_id,
    entry_date,
    created_by
  )
  values (
    p_account_id,
    'asset_purchase',
    'out',
    p_amount,
    coalesce(p_description, trim(p_name)),
    'asset_purchase',
    v_asset_id::text,
    coalesce(p_purchase_date, current_date)::timestamptz,
    v_user_id
  );

  return v_asset_id;
end;
$$;

revoke all on function public.record_asset_purchase(text, numeric, uuid, date, text) from public;
grant execute on function public.record_asset_purchase(text, numeric, uuid, date, text) to authenticated;

create or replace function public.record_prive(
  p_account_id uuid,
  p_amount numeric,
  p_entry_date timestamptz default now(),
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Prive amount must be greater than zero';
  end if;

  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and is_active
  ) then
    raise exception 'Payment account is not active';
  end if;

  if public.financial_account_balance(p_account_id) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into public.financial_entries (
    account_id,
    entry_type,
    direction,
    amount,
    description,
    reference_type,
    entry_id,
    entry_date,
    created_by
  )
  values (
    p_account_id,
    'prive',
    'out',
    p_amount,
    p_description,
    'prive',
    null,
    coalesce(p_entry_date, now()),
    v_user_id
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.record_prive(uuid, numeric, timestamptz, text) from public;
grant execute on function public.record_prive(uuid, numeric, timestamptz, text) to authenticated;

drop policy if exists "financial_transfers_admin_all" on public.financial_transfers;
create policy "financial_transfers_admin_read"
on public.financial_transfers for select
to authenticated
using (public.is_admin());

drop policy if exists "supplier_payables_admin_all" on public.supplier_payables;
create policy "supplier_payables_admin_read"
on public.supplier_payables for select
to authenticated
using (public.is_admin());

drop policy if exists "supplier_payments_admin_all" on public.supplier_payments;
create policy "supplier_payments_admin_read"
on public.supplier_payments for select
to authenticated
using (public.is_admin());

drop policy if exists "customer_receivables_admin_all" on public.customer_receivables;
create policy "customer_receivables_admin_read"
on public.customer_receivables for select
to authenticated
using (public.is_admin());

drop policy if exists "customer_payments_admin_all" on public.customer_payments;
create policy "customer_payments_admin_read"
on public.customer_payments for select
to authenticated
using (public.is_admin());

drop policy if exists "asset_purchases_admin_all" on public.asset_purchases;
create policy "asset_purchases_admin_read"
on public.asset_purchases for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on table public.financial_transfers from authenticated;
revoke insert, update, delete on table public.supplier_payables from authenticated;
revoke insert, update, delete on table public.supplier_payments from authenticated;
revoke insert, update, delete on table public.customer_receivables from authenticated;
revoke insert, update, delete on table public.customer_payments from authenticated;
revoke insert, update, delete on table public.asset_purchases from authenticated;

comment on function public.financial_account_balance(uuid) is
  'Returns current derived balance from financial_entries.';

comment on function public.create_financial_transfer(uuid, uuid, numeric, timestamptz, text) is
  'Atomically moves money between active financial accounts and writes both ledger entries.';

comment on function public.record_supplier_payment(uuid, uuid, numeric, timestamptz, text) is
  'Records an installment against a supplier payable, prevents overpayment, updates status, and writes the money-out ledger entry.';

comment on function public.record_customer_payment(uuid, uuid, numeric, timestamptz, text) is
  'Records an installment against a customer receivable, prevents overpayment, updates status, and writes the money-in ledger entry.';

comment on function public.record_asset_purchase(text, numeric, uuid, date, text) is
  'Records an asset purchase paid from a financial account and writes the money-out ledger entry.';

comment on function public.record_prive(uuid, numeric, timestamptz, text) is
  'Records owner withdrawal as money-out movement without formal equity accounting.';
