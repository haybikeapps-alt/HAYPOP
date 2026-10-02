-- HAYPOP M2.4.2 expense management
-- Connects operational expenses to the financial ledger.
-- Asset purchases and owner withdrawals reuse the hardened RPCs from 007.

create or replace function public.record_operating_expense(
  p_category text,
  p_category_label text,
  p_amount numeric,
  p_account_id uuid,
  p_expense_date date default current_date,
  p_description text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id text;
  v_user_id uuid;
  v_description text;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_category not in ('belanja_bahan', 'gaji_karyawan', 'operasional_lainnya', 'promosi') then
    raise exception 'Invalid operating expense category';
  end if;

  if nullif(trim(coalesce(p_category_label, '')), '') is null then
    raise exception 'Expense category label is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.financial_accounts
    where id = p_account_id
      and is_active
  ) then
    raise exception 'Payment account is not active';
  end if;

  if public.financial_account_balance(p_account_id) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  v_expense_id := 'exp-' || gen_random_uuid()::text;
  v_description := nullif(trim(coalesce(p_description, '')), '');

  insert into public.expenses (
    id,
    date,
    category,
    category_label,
    amount,
    description,
    recorded_by,
    recorded_by_name,
    timestamp
  )
  select
    v_expense_id,
    coalesce(p_expense_date, current_date),
    p_category,
    trim(p_category_label),
    p_amount,
    v_description,
    v_user_id,
    name,
    now()
  from public.profiles
  where id = v_user_id;

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
    'expense',
    'out',
    p_amount,
    v_description,
    'expense',
    v_expense_id,
    coalesce(p_expense_date, current_date)::timestamptz,
    v_user_id
  );

  return v_expense_id;
end;
$$;

revoke all on function public.record_operating_expense(text, text, numeric, uuid, date, text) from public;
grant execute on function public.record_operating_expense(text, text, numeric, uuid, date, text) to authenticated;

comment on function public.record_operating_expense(text, text, numeric, uuid, date, text) is
  'Records an operating expense, deducts the selected financial account through the ledger, and keeps the legacy expense record for reporting compatibility.';

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_read"
on public.expenses for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on table public.expenses from authenticated;
