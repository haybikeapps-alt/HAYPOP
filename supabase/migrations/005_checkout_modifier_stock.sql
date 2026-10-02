-- HAYPOP checkout hardening
-- Validates modifier selections and atomically consumes inventory-backed cup/topping items.

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
  v_line_total numeric;
  v_stock numeric;
  v_base_price numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_amount_paid numeric := 0;
  v_change numeric := 0;
  v_payment_method text;
  v_existing boolean;
  v_modifier_ids jsonb;
  v_modifier_id text;
  v_modifier_price numeric;
  v_modifier_total numeric;
  v_expected_unit_price numeric;
  v_group jsonb;
  v_option jsonb;
  v_group_count integer;
  v_selected_count integer;
  v_group_type text;
  v_group_required boolean;
  v_group_max integer;
  v_modifier_stock numeric;
  v_modifier_catalog_price numeric;
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
    v_modifier_ids := coalesce(v_item -> 'modifierOptionIds', '[]'::jsonb);

    if v_product_id is null or v_quantity is null or v_quantity <= 0
       or v_unit_price is null or v_unit_price < 0
       or v_line_total is null or v_line_total < 0
       or v_line_total <> round(v_unit_price * v_quantity, 2)
       or jsonb_typeof(v_modifier_ids) <> 'array' then
      raise exception 'INVALID_ITEM';
    end if;

    select stock, price, modifier_groups into v_stock, v_base_price, v_group
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

    v_modifier_total := 0;
    v_selected_count := jsonb_array_length(v_modifier_ids);

    -- Every selected modifier must be an option configured for this product.
    for v_modifier_id in select value from jsonb_array_elements_text(v_modifier_ids)
    loop
      select opt ->> 'price' into v_modifier_price
      from jsonb_array_elements(v_group) grp,
           jsonb_array_elements(coalesce(grp -> 'options', '[]'::jsonb)) opt
      where opt ->> 'id' = v_modifier_id
      limit 1;

      if not found then
        raise exception 'INVALID_MODIFIER:%', v_modifier_id;
      end if;

      v_modifier_total := v_modifier_total + coalesce(v_modifier_price, '0')::numeric;

      -- Cup/topping options are backed by inventory products. Their database
      -- price must match the configured modifier price and their stock is
      -- consumed atomically with the parent item.
      select stock, price into v_modifier_stock, v_modifier_catalog_price
      from public.products
      where id = v_modifier_id
        and is_available = true
      for update;

      if found then
        if v_modifier_catalog_price <> coalesce(v_modifier_price, '0')::numeric then
          raise exception 'MODIFIER_PRICE_MISMATCH:%', v_modifier_id;
        end if;
        if v_modifier_stock < v_quantity then
          raise exception 'INSUFFICIENT_MODIFIER_STOCK:%', v_modifier_id;
        end if;
        update public.products
        set stock = stock - v_quantity, updated_at = now()
        where id = v_modifier_id;
      end if;
    end loop;

    -- Enforce configured group cardinality and required groups.
    for v_group in select value from jsonb_array_elements(v_group)
    loop
      v_group_type := coalesce(v_group ->> 'type', 'single');
      v_group_required := coalesce((v_group ->> 'required')::boolean, false);
      v_group_max := nullif(v_group ->> 'max', '')::integer;
      v_group_count := 0;

      for v_option in select value from jsonb_array_elements(coalesce(v_group -> 'options', '[]'::jsonb))
      loop
        if v_modifier_ids ? (v_option ->> 'id') then
          v_group_count := v_group_count + 1;
        end if;
      end loop;

      if v_group_required and v_group_count = 0 then
        raise exception 'REQUIRED_MODIFIER_MISSING:%', v_group ->> 'id';
      end if;

      if v_group_type = 'single' and v_group_count > 1 then
        raise exception 'TOO_MANY_MODIFIERS:%', v_group ->> 'id';
      end if;

      if v_group_max is not null and v_group_count > v_group_max then
        raise exception 'TOO_MANY_MODIFIERS:%', v_group ->> 'id';
      end if;
    end loop;

    if v_selected_count <> (
      select count(*)
      from (
        select distinct value as id
        from jsonb_array_elements_text(v_modifier_ids)
      ) distinct_modifiers
    ) then
      raise exception 'DUPLICATE_MODIFIER';
    end if;

    v_expected_unit_price := v_base_price + v_modifier_total;
    if v_unit_price <> round(v_expected_unit_price, 2) then
      raise exception 'MODIFIER_TOTAL_MISMATCH:%', v_product_id;
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
    v_amount_paid, v_change, null, true, now()
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
