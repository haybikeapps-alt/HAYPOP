-- HAYPOP atomic checkout / stock movement
-- The RPC is the only client-facing path for creating a transaction.
-- It validates ownership, locks product rows, decrements stock atomically,
-- inserts the transaction, and records an audit event.

create or replace function public.create_transaction_with_stock(p_transaction jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cashier_id uuid;
  v_transaction_id text;
  v_invoice_number text;
  v_item jsonb;
  v_product_id text;
  v_quantity numeric;
  v_stock numeric;
  v_existing boolean;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_cashier_id := p_transaction ->> 'cashier_id';
  v_transaction_id := p_transaction ->> 'id';
  v_invoice_number := p_transaction ->> 'invoice_number';

  if v_cashier_id is null or v_cashier_id <> v_user::text then
    raise exception 'CASHIER_MISMATCH';
  end if;

  if coalesce(v_transaction_id, '') = '' or coalesce(v_invoice_number, '') = '' then
    raise exception 'INVALID_TRANSACTION';
  end if;

  -- Idempotency: an already-created transaction must not decrement stock twice.
  select exists(
    select 1 from public.transactions where id = v_transaction_id
  ) into v_existing;

  if v_existing then
    return true;
  end if;

  if exists(
    select 1 from public.transactions where invoice_number = v_invoice_number
  ) then
    raise exception 'INVOICE_ALREADY_EXISTS';
  end if;

  if jsonb_typeof(coalesce(p_transaction -> 'items', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_transaction -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'EMPTY_ITEMS';
  end if;

  -- Lock and decrement each product inside the same database transaction.
  for v_item in
    select value from jsonb_array_elements(p_transaction -> 'items')
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
    coalesce((p_transaction ->> 'subtotal')::numeric, 0),
    coalesce((p_transaction ->> 'discount')::numeric, 0),
    coalesce((p_transaction ->> 'tax')::numeric, 0),
    coalesce((p_transaction ->> 'total_amount')::numeric, 0),
    coalesce(p_transaction ->> 'payment_method', ''),
    coalesce((p_transaction ->> 'amount_paid')::numeric, 0),
    coalesce((p_transaction ->> 'change')::numeric, 0),
    p_transaction -> 'customer_snapshot',
    true,
    now()
  );

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
      'totalAmount', coalesce((p_transaction ->> 'total_amount')::numeric, 0)
    )
  );

  return true;
end;
$$;

revoke all on function public.create_transaction_with_stock(jsonb) from public;
grant execute on function public.create_transaction_with_stock(jsonb) to authenticated;

-- Prevent direct client inserts that could create sales without stock movement.
drop policy if exists "transactions_insert_own" on public.transactions;
