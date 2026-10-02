-- HAYPOP M2.4 Finance Completion
-- Customer receivables, POS-to-finance integration, default payment accounts,
-- reporting indexes, and hardened transaction accounting.

insert into public.financial_accounts (code, name, account_type, payment_method_code, description)
values
  ('CASH', 'Kas Tunai', 'cash', 'cash', 'Pembayaran tunai dari POS'),
  ('BANK', 'Transfer Bank', 'bank', 'transfer', 'Pembayaran transfer bank dari POS'),
  ('QRIS', 'QRIS', 'qris', 'qris', 'Pembayaran QRIS dari POS'),
  ('GOPAY', 'GoPay', 'ewallet', 'gopay', 'Pembayaran GoPay dari POS'),
  ('OVO', 'OVO', 'ewallet', 'ovo', 'Pembayaran OVO dari POS'),
  ('DANA', 'DANA', 'ewallet', 'dana', 'Pembayaran DANA dari POS'),
  ('SHOPEEPAY', 'ShopeePay', 'ewallet', 'shopeepay', 'Pembayaran ShopeePay dari POS')
on conflict (code) do nothing;

create index if not exists financial_entries_date_type_idx
  on public.financial_entries(entry_date desc, entry_type);

create index if not exists customer_receivables_due_status_idx
  on public.customer_receivables(due_date, status);

create or replace function public.create_customer_receivable(
  p_customer_id uuid,
  p_total_amount numeric,
  p_reference_number text default null,
  p_due_date date default null,
  p_transaction_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receivable_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if not exists (select 1 from public.customers where id = p_customer_id) then
    raise exception 'Customer not found';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Customer receivable amount must be greater than zero';
  end if;

  if p_transaction_id is not null and exists (
    select 1 from public.customer_receivables where transaction_id = p_transaction_id
  ) then
    select id into v_receivable_id
    from public.customer_receivables
    where transaction_id = p_transaction_id
    limit 1;
    return v_receivable_id;
  end if;

  insert into public.customer_receivables (
    customer_id,
    transaction_id,
    reference_number,
    total_amount,
    due_date,
    status,
    created_by
  )
  values (
    p_customer_id,
    p_transaction_id,
    nullif(trim(coalesce(p_reference_number, '')), ''),
    p_total_amount,
    p_due_date,
    'unpaid',
    v_user_id
  )
  returning id into v_receivable_id;

  return v_receivable_id;
end;
$$;

revoke all on function public.create_customer_receivable(uuid, numeric, text, date, text) from public;
grant execute on function public.create_customer_receivable(uuid, numeric, text, date, text) to authenticated;

-- Replace checkout with a finance-aware version. The operation remains atomic:
-- stock, transaction, sale ledger, and promotional discount ledger are committed together.
create or replace function public.create_transaction_with_stock(p_transaction jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cashier_id uuid;
  v_transaction_id text;
  v_invoice_number text;
  v_payment_method text;
  v_item jsonb;
  v_product_id text;
  v_quantity numeric;
  v_stock numeric;
  v_existing boolean;
  v_total numeric(14,2);
  v_subtotal numeric(14,2);
  v_discount numeric(14,2);
  v_tax numeric(14,2);
  v_account_id uuid;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_cashier_id := p_transaction ->> 'cashier_id';
  v_transaction_id := p_transaction ->> 'id';
  v_invoice_number := p_transaction ->> 'invoice_number';
  v_payment_method := lower(trim(coalesce(p_transaction ->> 'payment_method', '')));

  if v_cashier_id is null or v_cashier_id <> v_user::text then
    raise exception 'CASHIER_MISMATCH';
  end if;

  if coalesce(v_transaction_id, '') = '' or coalesce(v_invoice_number, '') = '' then
    raise exception 'INVALID_TRANSACTION';
  end if;

  select exists(select 1 from public.transactions where id = v_transaction_id)
    into v_existing;
  if v_existing then
    return true;
  end if;

  if exists(select 1 from public.transactions where invoice_number = v_invoice_number) then
    raise exception 'INVOICE_ALREADY_EXISTS';
  end if;

  if jsonb_typeof(coalesce(p_transaction -> 'items', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_transaction -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'EMPTY_ITEMS';
  end if;

  v_subtotal := coalesce((p_transaction ->> 'subtotal')::numeric, 0);
  v_discount := coalesce((p_transaction ->> 'discount')::numeric, 0);
  v_tax := coalesce((p_transaction ->> 'tax')::numeric, 0);
  v_total := coalesce((p_transaction ->> 'total_amount')::numeric, 0);

  if v_subtotal < 0 or v_discount < 0 or v_tax < 0 or v_total <= 0 then
    raise exception 'INVALID_TOTALS';
  end if;

  if v_discount > v_subtotal then
    raise exception 'INVALID_DISCOUNT';
  end if;

  select id into v_account_id
  from public.financial_accounts
  where payment_method_code = v_payment_method
    and is_active
  limit 1;

  if v_account_id is null then
    raise exception 'PAYMENT_ACCOUNT_NOT_CONFIGURED:%', v_payment_method;
  end if;

  for v_item in select value from jsonb_array_elements(p_transaction -> 'items')
  loop
    v_product_id := v_item ->> 'productId';
    v_quantity := (v_item ->> 'quantity')::numeric;

    if coalesce(v_product_id, '') = '' or v_quantity is null or v_quantity <= 0 then
      raise exception 'INVALID_ITEM';
    end if;

    select stock into v_stock
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_product_id;
    end if;

    if v_stock < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product_id;
    end if;

    update public.products
    set stock = stock - v_quantity,
        updated_at = now()
    where id = v_product_id;
  end loop;

  insert into public.transactions (
    id, invoice_number, cashier_id, cashier_name, timestamp, items,
    subtotal, discount, tax, total_amount, payment_method,
    amount_paid, change, customer_snapshot, is_synced, sync_timestamp
  )
  values (
    v_transaction_id,
    v_invoice_number,
    v_user,
    coalesce(p_transaction ->> 'cashier_name', ''),
    coalesce((p_transaction ->> 'timestamp')::timestamptz, now()),
    coalesce(p_transaction -> 'items', '[]'::jsonb),
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    v_payment_method,
    coalesce((p_transaction ->> 'amount_paid')::numeric, 0),
    coalesce((p_transaction ->> 'change')::numeric, 0),
    p_transaction -> 'customer_snapshot',
    true,
    now()
  );

  insert into public.financial_entries (
    account_id, entry_type, direction, amount, description,
    reference_type, reference_id, entry_date, created_by
  )
  values (
    v_account_id,
    'sale',
    'in',
    v_total,
    'Penjualan ' || v_invoice_number,
    'transaction',
    v_transaction_id,
    coalesce((p_transaction ->> 'timestamp')::timestamptz, now()),
    v_user
  );

  if v_discount > 0 then
    insert into public.financial_entries (
      account_id, entry_type, direction, amount, description,
      reference_type, reference_id, entry_date, created_by
    )
    values (
      v_account_id,
      'expense',
      'out',
      v_discount,
      'Promosi/Diskon ' || v_invoice_number,
      'transaction_discount',
      v_transaction_id,
      coalesce((p_transaction ->> 'timestamp')::timestamptz, now()),
      v_user
    );
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  values (
    v_user,
    'transaction_created',
    'transaction',
    v_transaction_id,
    jsonb_build_object(
      'invoiceNumber', v_invoice_number,
      'totalAmount', v_total,
      'paymentMethod', v_payment_method,
      'financialAccountId', v_account_id
    )
  );

  return true;
end;
$$;

revoke all on function public.create_transaction_with_stock(jsonb) from public;
grant execute on function public.create_transaction_with_stock(jsonb) to authenticated;

-- Financial movement tables remain read-only to clients; money moves through RPCs.
revoke insert, update, delete on table public.financial_entries from authenticated;
revoke insert, update, delete on table public.customer_receivables from authenticated;
revoke insert, update, delete on table public.customer_payments from authenticated;

drop policy if exists "financial_entries_admin_read" on public.financial_entries;
create policy "financial_entries_admin_read"
on public.financial_entries for select
to authenticated
using (public.is_admin());

drop policy if exists "customer_receivables_admin_read" on public.customer_receivables;
create policy "customer_receivables_admin_read"
on public.customer_receivables for select
to authenticated
using (public.is_admin());

drop policy if exists "customer_payments_admin_read" on public.customer_payments;
create policy "customer_payments_admin_read"
on public.customer_payments for select
to authenticated
using (public.is_admin());

comment on function public.create_customer_receivable(uuid, numeric, text, date, text) is
  'Creates an admin-only customer receivable and optionally links it to a transaction.';

comment on function public.create_transaction_with_stock(jsonb) is
  'Atomic checkout: validates stock, creates the sale, records the selected financial account inflow, records discount as promotional expense, and writes an audit log.';
