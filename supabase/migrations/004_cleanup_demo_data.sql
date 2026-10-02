-- HAYPOP demo data cleanup
-- Removes known legacy demo transactions/expenses/products and recreates
-- exactly one demo product for each category used by the current POS:
-- minuman, makanan, snack, cup, topping, paket.
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
  'prod-drink-1',
  'prod-drink-2',
  'prod-food-1',
  'prod-snack-1',
  'prod-cup-1',
  'prod-cup-2',
  'prod-cup-3',
  'prod-cup-4',
  'prod-top-1',
  'prod-top-2',
  'prod-top-3',
  'prod-top-4',
  'prod-top-5',
  'prod-package-1'
);

insert into public.products
(id, name, category, price, stock, unit, image, description, modifier_groups, is_available)
values
(
  'prod-drink-1',
  'Signature Brown Sugar Boba Fresh Milk',
  'minuman',
  24000,
  120,
  'Cup',
  'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
  'Susu segar dengan gula aren dan boba. Pilihan cup dan topping dilakukan saat checkout.',
  jsonb_build_array(
    jsonb_build_object(
      'id','cup-choice','title','Pilihan Cup','type','single','required',true,
      'options',jsonb_build_array(jsonb_build_object('id','prod-cup-1','name','Cup Reguler 16 oz','price',0))
    ),
    jsonb_build_object(
      'id','drink-sugar','title','Level Kemanisan','type','single','required',true,
      'options',jsonb_build_array(
        jsonb_build_object('id','sugar-100','name','Normal Sweet (100%)','price',0),
        jsonb_build_object('id','sugar-70','name','Less Sweet (70%)','price',0),
        jsonb_build_object('id','sugar-50','name','Half Sweet (50%)','price',0),
        jsonb_build_object('id','sugar-0','name','No Sugar (0%)','price',0)
      )
    ),
    jsonb_build_object(
      'id','drink-ice','title','Level Es','type','single','required',true,
      'options',jsonb_build_array(
        jsonb_build_object('id','ice-normal','name','Normal Ice','price',0),
        jsonb_build_object('id','ice-less','name','Less Ice','price',0),
        jsonb_build_object('id','ice-none','name','No Ice','price',0)
      )
    ),
    jsonb_build_object(
      'id','topping-choice','title','Topping','type','multiple','required',false,'max',1,
      'options',jsonb_build_array(jsonb_build_object('id','prod-top-1','name','Boba Pearl Brown Sugar','price',3000))
    )
  ),
  true
),
(
  'prod-food-1',
  'Crispy Popcorn Chicken Spicy BBQ',
  'makanan',
  22000,
  95,
  'Porsi',
  'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
  'Ayam popcorn renyah dengan bumbu BBQ. Pilihan topping dapat ditambahkan saat checkout.',
  jsonb_build_array(
    jsonb_build_object(
      'id','food-size','title','Ukuran Porsi','type','single','required',true,
      'options',jsonb_build_array(
        jsonb_build_object('id','food-reg','name','Reguler (150gr)','price',0),
        jsonb_build_object('id','food-jumbo','name','Jumbo (250gr)','price',7000)
      )
    ),
    jsonb_build_object(
      'id','food-spice','title','Level Kepedasan','type','single','required',true,
      'options',jsonb_build_array(
        jsonb_build_object('id','spice-0','name','Level 0','price',0),
        jsonb_build_object('id','spice-1','name','Level 1','price',0),
        jsonb_build_object('id','spice-2','name','Level 2','price',0),
        jsonb_build_object('id','spice-3','name','Level 3','price',0)
      )
    ),
    jsonb_build_object(
      'id','topping-choice','title','Topping / Tambahan','type','multiple','required',false,'max',1,
      'options',jsonb_build_array(jsonb_build_object('id','prod-top-1','name','Boba Pearl Brown Sugar','price',3000))
    )
  ),
  true
),
(
  'prod-snack-1',
  'Golden French Fries Truffle Mayo',
  'snack',
  18000,
  80,
  'Porsi',
  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
  'Kentang goreng renyah dengan truffle mayo.',
  jsonb_build_array(
    jsonb_build_object(
      'id','snack-size','title','Ukuran','type','single','required',true,
      'options',jsonb_build_array(
        jsonb_build_object('id','snack-reg','name','Reguler','price',0),
        jsonb_build_object('id','snack-large','name','Large','price',5000)
      )
    ),
    jsonb_build_object(
      'id','topping-choice','title','Topping / Tambahan','type','multiple','required',false,'max',1,
      'options',jsonb_build_array(jsonb_build_object('id','prod-top-1','name','Boba Pearl Brown Sugar','price',3000))
    )
  ),
  true
),
(
  'prod-cup-1',
  'Cup Reguler 16 oz',
  'cup',
  0,
  500,
  'Pcs',
  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
  'Kemasan cup reguler yang dipilih saat checkout.',
  '[]'::jsonb,
  true
),
(
  'prod-top-1',
  'Boba Pearl Brown Sugar',
  'topping',
  3000,
  160,
  'Porsi',
  'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
  'Topping boba yang dipilih saat checkout.',
  '[]'::jsonb,
  true
),
(
  'prod-package-1',
  'Paket HAYPOP Hemat',
  'paket',
  42000,
  50,
  'Paket',
  'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&auto=format&fit=crop&q=80',
  'Paket demo untuk kategori paket.',
  '[]'::jsonb,
  true
);
