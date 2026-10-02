-- HAYPOP demo data cleanup
-- Removes legacy demo transactions/expenses and legacy demo products,
-- keeping exactly one demo product for each storefront/inventory category.
-- Review the IDs before running in Supabase SQL Editor.

delete from public.transactions
where id in ('trx-demo-01', 'trx-demo-02', 'trx-demo-03');

delete from public.expenses
where id in (
  'exp-asset-1',
  'exp-asset-2',
  'exp-asset-3',
  'exp-raw-1',
  'exp-raw-2',
  'exp-salary-1',
  'exp-ops-1'
);

delete from public.products
where id in (
  'prod-drink-2',
  'prod-cup-2',
  'prod-cup-3',
  'prod-cup-4',
  'prod-top-2',
  'prod-top-3',
  'prod-top-4',
  'prod-top-5'
);

update public.products
set
  name = 'Cup Reguler 16 oz',
  category = 'cup',
  price = 0,
  unit = 'Pcs',
  description = 'Kemasan cup reguler yang dipilih saat checkout.',
  modifier_groups = '[]'::jsonb,
  is_available = true,
  updated_at = now()
where id = 'prod-cup-1';

update public.products
set
  name = 'Boba Pearl Brown Sugar',
  category = 'topping',
  price = 3000,
  unit = 'Porsi',
  description = 'Topping boba yang dipilih saat checkout.',
  modifier_groups = '[]'::jsonb,
  is_available = true,
  updated_at = now()
where id = 'prod-top-1';

-- Remove old demo-only cached transaction/expense data is handled by the app
-- when the new frontend is loaded. This migration is intentionally limited
-- to known legacy demo IDs and does not delete arbitrary business data.
