-- HAYPOP M2.4.3 supplier payable management
-- Creates supplier debt records through an admin-only RPC and keeps installment
-- payments on the hardened ledger/payment flow from migration 007.

create or replace function public.create_supplier_payable(
  p_supplier_id uuid,
  p_total_amount numeric,
  p_reference_number text default null,
  p_description text default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payable_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if not exists (
    select 1 from public.suppliers
    where id = p_supplier_id
  ) then
    raise exception 'Supplier not found';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Supplier payable amount must be greater than zero';
  end if;

  insert into public.supplier_payables (
    supplier_id,
    reference_number,
    description,
    total_amount,
    due_date,
    status,
    created_by
  )
  values (
    p_supplier_id,
    nullif(trim(coalesce(p_reference_number, '')), ''),
    nullif(trim(coalesce(p_description, '')), ''),
    p_total_amount,
    p_due_date,
    'unpaid',
    v_user_id
  )
  returning id into v_payable_id;

  return v_payable_id;
end;
$$;

revoke all on function public.create_supplier_payable(uuid, numeric, text, text, date) from public;
grant execute on function public.create_supplier_payable(uuid, numeric, text, text, date) to authenticated;

drop policy if exists "supplier_payables_admin_read" on public.supplier_payables;
create policy "supplier_payables_admin_read"
on public.supplier_payables for select
to authenticated
using (public.is_admin());

drop policy if exists "supplier_payments_admin_read" on public.supplier_payments;
create policy "supplier_payments_admin_read"
on public.supplier_payments for select
to authenticated
using (public.is_admin());

revoke insert, update, delete on table public.supplier_payables from authenticated;
revoke insert, update, delete on table public.supplier_payments from authenticated;

comment on function public.create_supplier_payable(uuid, numeric, text, text, date) is
  'Creates a supplier payable through an admin-only RPC. Installment payments are recorded with record_supplier_payment().';
