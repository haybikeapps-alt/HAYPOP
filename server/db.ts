import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { randomBytes, scryptSync } from 'node:crypto';

// Ensure data folder exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'haypop.sqlite');
export const db = new DatabaseSync(dbPath);

function hashPin(pin: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(pin, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString('hex');
  return `scrypt$131072$8$1${salt}${hash}`;
}

function migrateUserPins() {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'pin_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN pin_hash TEXT');
  }

  const legacyUsers = db.prepare('SELECT id, pin, pin_hash FROM users WHERE (pin_hash IS NULL OR pin_hash = \'\') AND pin IS NOT NULL AND pin != \'\'').all() as any[];
  for (const user of legacyUsers) {
    db.prepare('UPDATE users SET pin_hash = ?, pin = ? WHERE id = ?').run(hashPin(String(user.pin)), '', user.id);
  }
}

// Initialize Tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      unit TEXT NOT NULL,
      image TEXT,
      description TEXT,
      modifier_groups TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL DEFAULT '',
      pin_hash TEXT,
      role TEXT NOT NULL,
      avatar_color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      change REAL NOT NULL DEFAULT 0,
      customer TEXT,
      is_synced INTEGER NOT NULL DEFAULT 1,
      sync_timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      category_label TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      recorded_by TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS key_value_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  // Migrate legacy plaintext PINs before any authentication request.
  migrateUserPins();

  // Seed default data if database is brand new
  seedInitialData();
}

function seedInitialData() {
  const countStmt = db.prepare('SELECT count(*) as count FROM products');
  const result = countStmt.get() as { count: number };

  if (result && result.count > 0) {
    return; // Already seeded
  }

  console.log('[DB] Seeding initial database data...');

  // 1. Initial Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, price, stock, unit, image, description, modifier_groups, is_available, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialProducts = [
    {
      id: 'prod-drink-1',
      name: 'Signature Brown Sugar Boba Fresh Milk',
      category: 'minuman',
      price: 24000,
      stock: 120,
      unit: 'Cup',
      image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
      description: 'Susu segar premium berpadu dengan gula aren murni karamel dan mutiara boba kenyal hangat buatan tangan.',
      modifier_groups: JSON.stringify([
        {
          id: 'mod-drink-cup',
          title: 'Ukuran Cup',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-cup-reg', name: 'Reguler (16 oz)', price: 0 },
            { id: 'opt-cup-large', name: 'Large (22 oz)', price: 4000 },
          ],
        },
        {
          id: 'mod-drink-sugar',
          title: 'Level Kemanisan (Sugar)',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-sug-100', name: 'Normal Sweet (100%)', price: 0 },
            { id: 'opt-sug-70', name: 'Less Sweet (70%)', price: 0 },
            { id: 'opt-sug-50', name: 'Half Sweet (50%)', price: 0 },
            { id: 'opt-sug-0', name: 'No Sugar (0%)', price: 0 },
          ],
        },
        {
          id: 'mod-drink-ice',
          title: 'Level Es (Ice)',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-ice-normal', name: 'Normal Ice', price: 0 },
            { id: 'opt-ice-less', name: 'Less Ice', price: 0 },
            { id: 'opt-ice-none', name: 'No Ice', price: 0 },
          ],
        },
        {
          id: 'mod-drink-toppings',
          title: 'Pilihan Topping Tambahan',
          type: 'multiple',
          required: false,
          max: 3,
          options: [
            { id: 'opt-top-boba', name: 'Extra Boba Pearl', price: 3000 },
            { id: 'opt-top-grass', name: 'Grass Jelly (Cincau Hitam)', price: 3000 },
            { id: 'opt-top-pudding', name: 'Silky Egg Pudding', price: 4000 },
            { id: 'opt-top-cheese', name: 'Creamy Cheese Foam', price: 5000 },
          ],
        },
      ]),
      is_available: 1,
    },
    {
      id: 'prod-food-1',
      name: 'Crispy Popcorn Chicken Spicy BBQ',
      category: 'makanan',
      price: 22000,
      stock: 95,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
      description: 'Daging ayam fillet paha juicy berbalut tepung renyah keemasan dengan taburan bumbu smokey BBQ dan rempah pedas gurih.',
      modifier_groups: JSON.stringify([
        {
          id: 'mod-food-size',
          title: 'Porsi / Ukuran Box',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-size-reg', name: 'Porsi Reguler (150gr)', price: 0 },
            { id: 'opt-size-jumbo', name: 'Porsi Jumbo (250gr)', price: 7000 },
          ],
        },
        {
          id: 'mod-food-spice',
          title: 'Level Kepedasan',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-spc-0', name: 'Level 0: Manis Gurih (Tidak Pedas)', price: 0 },
            { id: 'opt-spc-1', name: 'Level 1: Sedang (Mild Chili)', price: 0 },
            { id: 'opt-spc-2', name: 'Level 2: Pedas Mantap (Hot)', price: 0 },
            { id: 'opt-spc-3', name: 'Level 3: Super Pedas (Extra Hot 🔥)', price: 0 },
          ],
        },
        {
          id: 'mod-food-seasoning',
          title: 'Pilihan Bumbu Tabur Utama',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-flv-bbq', name: 'Smokey BBQ Signature', price: 0 },
            { id: 'opt-flv-cheese', name: 'Cheddar Cheese Gold', price: 0 },
            { id: 'opt-flv-seaweed', name: 'Crispy Seaweed Nori', price: 0 },
          ],
        },
      ]),
      is_available: 1,
    },
    {
      id: 'prod-drink-2',
      name: 'Matcha Kyoto Cream Cloud',
      category: 'minuman',
      price: 26000,
      stock: 65,
      unit: 'Cup',
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      description: 'Matcha Uji otentik beraroma pekat dengan lapisan cold foam susu lembut gurih manis.',
      modifier_groups: JSON.stringify([
        {
          id: 'mod-drink-cup',
          title: 'Ukuran Cup',
          type: 'single',
          required: true,
          options: [
            { id: 'opt-cup-reg', name: 'Reguler (16 oz)', price: 0 },
            { id: 'opt-cup-large', name: 'Large (22 oz)', price: 4000 },
          ],
        },
      ]),
      is_available: 1,
    },
    {
      id: 'prod-snack-1',
      name: 'Golden French Fries Truffle Mayo',
      category: 'snack',
      price: 18000,
      stock: 80,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
      description: 'Kentang goreng impor renyah di luar lembut di dalam dengan taburan sea salt dan saus truffle mayo.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    // Cups & Packaging Category
    {
      id: 'prod-cup-1',
      name: 'Cup Sealer Reguler (16 oz)',
      category: 'cup',
      price: 0,
      stock: 500,
      unit: 'Pcs',
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
      description: 'Cup plastik tebal standar 16 oz dengan lid cup sealer untuk minuman dingin reguler.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-cup-2',
      name: 'Cup Sealer Large (22 oz)',
      category: 'cup',
      price: 4000,
      stock: 420,
      unit: 'Pcs',
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      description: 'Cup plastik ukuran besar 22 oz untuk porsi ekstra puas (+Rp 4.000).',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-cup-3',
      name: 'Paper Box Popcorn Reguler (150gr)',
      category: 'cup',
      price: 0,
      stock: 350,
      unit: 'Pcs',
      image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80',
      description: 'Kemasan box karton food-grade tahan minyak untuk popcorn chicken reguler.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-cup-4',
      name: 'Paper Box Popcorn Jumbo (250gr)',
      category: 'cup',
      price: 7000,
      stock: 280,
      unit: 'Pcs',
      image: 'https://images.unsplash.com/photo-1585325701165-351af916e581?w=600&auto=format&fit=crop&q=80',
      description: 'Kemasan box porsi jumbo untuk popcorn chicken isi lebih banyak (+Rp 7.000).',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    // Toppings Category
    {
      id: 'prod-top-1',
      name: 'Boba Pearl Brown Sugar',
      category: 'topping',
      price: 3000,
      stock: 160,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
      description: 'Mutiara tapioka kenyal berbalut karamel gula aren asli dimasak segar tiap 3 jam.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-top-2',
      name: 'Grass Jelly (Cincau Hitam Alami)',
      category: 'topping',
      price: 3000,
      stock: 130,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
      description: 'Cincau hitam herbal dingin pereda dahaga tekstur kenyal lembut.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-top-3',
      name: 'Silky Egg Pudding',
      category: 'topping',
      price: 4000,
      stock: 90,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&auto=format&fit=crop&q=80',
      description: 'Puding telur lembut manis beraroma custard vanila lumer di mulut.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-top-4',
      name: 'Creamy Cheese Foam',
      category: 'topping',
      price: 5000,
      stock: 75,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80',
      description: 'Lapisan busa keju tebal gurih asin manis dengan cream cheese premium New Zealand.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
    {
      id: 'prod-top-5',
      name: 'Extra Saus Keju Lumer (Dip)',
      category: 'topping',
      price: 4000,
      stock: 110,
      unit: 'Porsi',
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
      description: 'Cocolan saus keju cheddar hangat kental untuk ayam popcorn atau kentang goreng.',
      modifier_groups: JSON.stringify([]),
      is_available: 1,
    },
  ];

  for (const p of initialProducts) {
    insertProduct.run(
      p.id,
      p.name,
      p.category,
      p.price,
      p.stock,
      p.unit,
      p.image,
      p.description,
      p.modifier_groups,
      p.is_available,
      new Date().toISOString()
    );
  }

  // 2. Initial Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, pin, pin_hash, role, avatar_color, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialUsers = [
    {
      id: 'usr-admin-1',
      name: 'Manager Owner Admin',
      username: 'admin',
      pin: '1234',
      role: 'admin',
      avatar_color: 'bg-emerald-700',
      is_active: 1,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'usr-kasir-1',
      name: 'Siti Rahma (Kasir 1)',
      username: 'kasir1',
      pin: '0000',
      role: 'kasir',
      avatar_color: 'bg-teal-600',
      is_active: 1,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'usr-kasir-2',
      name: 'Budi Santoso (Kasir 2)',
      username: 'kasir2',
      pin: '1111',
      role: 'kasir',
      avatar_color: 'bg-emerald-600',
      is_active: 1,
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ];

  for (const u of initialUsers) {
    insertUser.run(u.id, u.name, u.username, '', hashPin(u.pin), u.role, u.avatar_color, u.is_active, u.created_at);
  }

  // 3. Initial Expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, date, category, category_label, amount, description, recorded_by, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialExpenses = [
    {
      id: 'exp-asset-1',
      date: '2026-08-01',
      category: 'pembelian_aset',
      category_label: 'Pembelian Aset (CapEx)',
      amount: 14500000,
      description: 'Mesin Cup Sealer Otomatis Full Digital & Deep Fryer Double Basket Listrik',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'exp-asset-2',
      date: '2026-08-02',
      category: 'pembelian_aset',
      category_label: 'Pembelian Aset (CapEx)',
      amount: 11000000,
      description: 'Under-Counter Chiller Kulkas Susu & Showcase Minuman Dingin',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-08-02T10:30:00.000Z',
    },
    {
      id: 'exp-asset-3',
      date: '2026-08-05',
      category: 'pembelian_aset',
      category_label: 'Pembelian Aset (CapEx)',
      amount: 9500000,
      description: 'Interior Booth Minimalis, Neon Box HAYPOP & Sound System Kasir',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-08-05T14:15:00.000Z',
    },
    {
      id: 'exp-raw-1',
      date: '2026-09-01',
      category: 'belanja_bahan',
      category_label: 'Belanja Bahan Baku',
      amount: 4200000,
      description: 'Restock Tapioca Boba Pearl (50kg), Brown Sugar Aren, Fresh Milk 100L',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'exp-raw-2',
      date: '2026-09-15',
      category: 'belanja_bahan',
      category_label: 'Belanja Bahan Baku',
      amount: 3800000,
      description: 'Ayam Fillet Paha Segar (60kg), Bumbu Marinasi BBQ & Tepung Crispy',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-09-15T08:30:00.000Z',
    },
    {
      id: 'exp-salary-1',
      date: '2026-09-25',
      category: 'gaji_karyawan',
      category_label: 'Gaji Karyawan',
      amount: 6000000,
      description: 'Gaji 2 Staff Kasir & Kitchen Crew Periode September',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-09-25T11:00:00.000Z',
    },
    {
      id: 'exp-ops-1',
      date: '2026-09-30',
      category: 'operasional_lainnya',
      category_label: 'Operasional Harian',
      amount: 1500000,
      description: 'Listrik, Air, Gas & Kemasan Cup/Paper Bag Sablon HAYPOP',
      recorded_by: 'Manager Owner Admin',
      timestamp: '2026-09-30T16:00:00.000Z',
    },
  ];

  for (const e of initialExpenses) {
    insertExpense.run(e.id, e.date, e.category, e.category_label, e.amount, e.description, e.recorded_by, e.timestamp);
  }

  // 4. Initial Transactions
  const insertTrx = db.prepare(`
    INSERT INTO transactions (id, invoice_number, cashier_id, cashier_name, timestamp, items, subtotal, discount, tax, total_amount, payment_method, amount_paid, change, customer, is_synced, sync_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTransactions = [
    {
      id: 'trx-demo-01',
      invoice_number: 'INV/20261001/001',
      cashier_id: 'usr-kasir-1',
      cashier_name: 'Siti Rahma (Kasir 1)',
      timestamp: new Date().toISOString(),
      items: JSON.stringify([
        {
          productId: 'prod-drink-1',
          productName: 'Signature Brown Sugar Boba Fresh Milk',
          quantity: 2,
          unitPrice: 28000,
          totalPrice: 56000,
          modifiersSummary: ['Large (22 oz)', 'Less Sweet (70%)', 'Normal Ice', 'Extra Boba Pearl'],
        },
        {
          productId: 'prod-food-1',
          productName: 'Crispy Popcorn Chicken Spicy BBQ',
          quantity: 1,
          unitPrice: 22000,
          totalPrice: 22000,
          modifiersSummary: ['Porsi Reguler (150gr)', 'Level 2: Pedas Mantap', 'Smokey BBQ Signature'],
        },
      ]),
      subtotal: 78000,
      discount: 0,
      tax: 0,
      total_amount: 78000,
      payment_method: 'qris',
      amount_paid: 78000,
      change: 0,
      customer: null,
      is_synced: 1,
      sync_timestamp: new Date().toISOString(),
    },
  ];

  for (const t of initialTransactions) {
    insertTrx.run(
      t.id,
      t.invoice_number,
      t.cashier_id,
      t.cashier_name,
      t.timestamp,
      t.items,
      t.subtotal,
      t.discount,
      t.tax,
      t.total_amount,
      t.payment_method,
      t.amount_paid,
      t.change,
      t.customer,
      t.is_synced,
      t.sync_timestamp
    );
  }

  // 5. Initial Store & Payment Settings
  const insertKv = db.prepare('INSERT OR REPLACE INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?)');

  const defaultStoreSettings = {
    storeName: 'HAYPOP',
    tagline: 'Fresh Drinks & Crispy Bites',
    address: 'Jl. Boulevard Raya Blok AA No. 12, Jakarta',
    phone: '0812-3456-7890',
    logoAlignment: 'center',
    showLogoOnReceipt: true,
    paperWidth: '58mm',
    receiptFooter: 'Terima kasih atas kunjungan Anda!\nFollow Instagram kami @haypop.id',
    receiptSocial: 'Instagram: @haypop.id',
    taxPercentage: 0,
    enableTax: false,
    currency: 'IDR',
  };

  const defaultPaymentSettings = {
    qris: {
      merchantName: 'HAYPOP BOBA & CHICKEN',
      nmid: 'ID1020268899201',
      instructions: 'Pindai kode QRIS menggunakan GoPay, OVO, DANA, BCA, Mandiri, atau m-Banking apapun.',
    },
    transfer: {
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '8830-1928-4411',
      accountHolder: 'HAYPOP INDONESIA OFFICIAL',
      isActive: true,
    },
    ewallets: {
      gopay: { number: '0812-8888-9999', name: 'HAYPOP Official', isActive: true },
      ovo: { number: '0812-8888-9999', name: 'HAYPOP Official', isActive: true },
      dana: { number: '0812-8888-9999', name: 'HAYPOP Official', isActive: true },
      shopeepay: { number: '0812-8888-9999', name: 'HAYPOP Official', isActive: true },
    },
  };

  insertKv.run('store_settings', JSON.stringify(defaultStoreSettings), new Date().toISOString());
  insertKv.run('payment_settings', JSON.stringify(defaultPaymentSettings), new Date().toISOString());

  console.log('[DB] Seeding complete! Database initialized successfully.');
}
