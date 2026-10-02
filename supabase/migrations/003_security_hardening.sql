create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
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
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

-- HAYPOP security hardening
-- Safe user provisioning defaults, profile invariants, audit events,
-- and server-side transaction invariants.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base_username text;
  v_username text;
begin
  v_base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, new.id::text), '@', 1)),
    '[^a-z0-9._-]', '', 'g'
  ));
  v_username := nullif(v_base_username, '');
  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, new.id::text), '@', 1)),
    v_username,
    'kasir'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.protect_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_admins integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if new.id = auth.uid()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'CANNOT_CHANGE_OWN_ACCESS';
  end if;

  if (old.role = 'admin' and old.is_active)
     and (new.role <> 'admin' or not new.is_active) then
    select count(*) into v_other_admins
    from public.profiles
    where id <> old.id
      and role = 'admin'
      and is_active = true;

    if v_other_admins = 0 then
      raise exception 'LAST_ADMIN_PROTECTED';
    end if;
  end if;

  new.username := lower(trim(new.username));
  if new.username = '' then
    raise exception 'INVALID_USERNAME';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_changes on public.profiles;
create trigger protect_profile_changes
before update on public.profiles
for each row execute procedure public.protect_profile_changes();

create or replace function public.audit_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'profile_role_changed', 'profile', new.id::text,
      jsonb_build_object('from', old.role, 'to', new.role));
  end if;

  if old.is_active is distinct from new.is_active then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'profile_status_changed', 'profile', new.id::text,
      jsonb_build_object('isActive', new.is_active));
  end if;

  return new;
end;
$$;

drop trigger if exists audit_profile_changes on public.profiles;
create trigger audit_profile_changes
after update on public.profiles
for each row execute procedure public.audit_profile_changes();

create or replace function public.create_transaction_with_stock(p_transaction jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cashier_id uuid;
  v_cashier_name text;
  v_transaction_id text;
  v_invoice_number text;
  v_item jsonb;
  v_product_id text;
  v_quantity numeric;
  v_unit_price numeric;
  v_base_price numeric;
  v_line_total numeric;
  v_stock numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_amount_paid numeric := 0;
  v_change numeric := 0;
  v_payment_method text;
  v_existing boolean;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_cashier_id := nullif(p_transaction ->> 'cashier_id', '')::uuid;
  v_transaction_id := nullif(trim(p_transaction ->> 'id'), '');
  v_invoice_number := nullif(trim(p_transaction ->> 'invoice_number'), '');

  if v_cashier_id is null or v_cashier_id <> v_user then
    raise exception 'CASHIER_MISMATCH';
  end if;

  select name into v_cashier_name
  from public.profiles
  where id = v_user and is_active = true;

  if not found then
    raise exception 'CASHIER_PROFILE_NOT_FOUND';
  end if;

  if v_transaction_id is null or v_invoice_number is null then
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

  for v_item in select value from jsonb_array_elements(p_transaction -> 'items')
  loop
    v_product_id := nullif(trim(v_item ->> 'productId'), '');
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;
    v_line_total := (v_item ->> 'totalPrice')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity <= 0
       or v_unit_price is null or v_unit_price < 0
       or v_line_total is null or v_line_total < 0
       or v_line_total <> round(v_unit_price * v_quantity, 2) then
      raise exception 'INVALID_ITEM';
    end if;

    select stock, price into v_stock, v_base_price
    from public.products
    where id = v_product_id
      and is_available = true
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_AVAILABLE:%', v_product_id;
    end if;

    if v_stock < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product_id;
    end if;

    -- Never allow the client to undercharge below the canonical product price.
    -- Modifier pricing is still allowed on top of the base product price.
    if v_unit_price < v_base_price then
      raise exception 'PRICE_BELOW_CATALOG:%', v_product_id;
    end if;

    v_subtotal := v_subtotal + v_line_total;

    update public.products
    set stock = stock - v_quantity, updated_at = now()
    where id = v_product_id;
  end loop;

  v_discount := coalesce((p_transaction ->> 'discount')::numeric, 0);
  v_tax := coalesce((p_transaction ->> 'tax')::numeric, 0);
  v_total := coalesce((p_transaction ->> 'total_amount')::numeric, 0);
  v_amount_paid := coalesce((p_transaction ->> 'amount_paid')::numeric, 0);
  v_change := coalesce((p_transaction ->> 'change')::numeric, 0);
  v_payment_method := lower(trim(coalesce(p_transaction ->> 'payment_method', '')));

  if v_discount < 0 or v_discount > v_subtotal
     or v_tax < 0
     or v_total <> round(v_subtotal - v_discount + v_tax, 2)
     or v_amount_paid < v_total
     or v_change <> round(v_amount_paid - v_total, 2)
     or v_payment_method not in ('qris','cash','transfer','gopay','ovo','dana','shopeepay') then
    raise exception 'INVALID_PAYMENT_TOTALS';
  end if;

  insert into public.transactions (
    id, invoice_number, cashier_id, cashier_name, timestamp, items,
    subtotal, discount, tax, total_amount, payment_method,
    amount_paid, change, customer_snapshot, is_synced, sync_timestamp
  )
  values (
    v_transaction_id, v_invoice_number, v_user, v_cashier_name,
    coalesce((p_transaction ->> 'timestamp')::timestamptz, now()),
    p_transaction -> 'items',
    v_subtotal, v_discount, v_tax, v_total, v_payment_method,
    v_amount_paid, v_change, p_transaction -> 'customer_snapshot', true, now()
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user, 'transaction_created', 'transaction', v_transaction_id,
    jsonb_build_object('invoiceNumber', v_invoice_number, 'totalAmount', v_total)
  );

  return true;
end;
$$;

revoke all on function public.create_transaction_with_stock(jsonb) from public;
grant execute on function public.create_transaction_with_stock(jsonb) to authenticated;

drop policy if exists "transactions_insert_own" on public.transactions;

-- Transactions are immutable from the client. Refund/void operations must use
-- a dedicated server-side workflow that also reverses stock correctly.
drop policy if exists "transactions_admin_update" on public.transactions;
drop policy if exists "transactions_admin_delete" on public.transactions;

-- Audit records must only be written by trusted database workflows.
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;

-- Explicit Data API grants: RLS is the row filter, grants are the operation gate.
revoke all on table public.profiles, public.categories, public.suppliers, public.customers,
  public.products, public.transactions, public.expenses, public.settings, public.audit_logs
  from anon;

revoke all on table public.profiles, public.categories, public.suppliers, public.customers,
  public.products, public.transactions, public.expenses, public.settings, public.audit_logs
  from authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.suppliers to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select on table public.transactions to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.settings to authenticated;
grant select on table public.audit_logs to authenticated;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_active_user() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
