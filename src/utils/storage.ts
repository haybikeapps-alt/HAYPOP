import { Product, User, Transaction, ExpenseRecord, StoreSettings, PaymentAccountSettings } from '../types';
import {
  apiGetProducts,
  apiSaveProduct,
  apiGetTransactions,
  apiSaveTransaction,
  apiSyncBatchTransactions,
  apiGetExpenses,
  apiSaveExpense,
  apiDeleteExpense,
  apiGetUsers,
  apiSaveUser,
  apiGetStoreSettings,
  apiSaveStoreSettings,
  apiGetPaymentSettings,
  apiSavePaymentSettings,
} from './api';

const STORAGE_KEYS = {
  PRODUCTS: 'haypop_products',
  USERS: 'haypop_users',
  CURRENT_USER: 'haypop_current_user',
  TRANSACTIONS: 'haypop_transactions',
  OFFLINE_QUEUE: 'haypop_offline_queue',
  EXPENSES: 'haypop_expenses',
  STORE_SETTINGS: 'haypop_store_settings',
  PAYMENT_SETTINGS: 'haypop_payment_settings',
};

// Initial Demo Products requested by user:
// 1 minuman demo: Signature Brown Sugar Boba Fresh Milk with topping, cup kecil/besar, level kemanisan
// 1 makanan demo: Crispy Popcorn Chicken Spicy BBQ with porsi, level kepedasan, bumbu tabur
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-drink-1',
    name: 'Signature Brown Sugar Boba Fresh Milk',
    category: 'minuman',
    price: 24000,
    stock: 120,
    unit: 'Cup',
    image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
    description: 'Susu segar premium berpadu dengan gula aren murni karamel dan mutiara boba kenyal hangat buatan tangan.',
    isAvailable: true,
    modifierGroups: [
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
          { id: 'opt-sug-30', name: 'Low Sweet (30%)', price: 0 },
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
    ],
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
    isAvailable: true,
    modifierGroups: [
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
          { id: 'opt-flv-salt', name: 'Original Salt & Pepper', price: 0 },
        ],
      },
      {
        id: 'mod-food-addons',
        title: 'Extra Saus & Pelengkap',
        type: 'multiple',
        required: false,
        options: [
          { id: 'opt-add-sauce', name: 'Extra Dip Saus Keju Lumer', price: 4000 },
          { id: 'opt-add-mayo', name: 'Spicy Mentai Mayo Dip', price: 4000 },
          { id: 'opt-add-fries', name: 'Add Mini French Fries', price: 6000 },
        ],
      },
    ],
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
    isAvailable: true,
    modifierGroups: [
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
          { id: 'opt-sug-50', name: 'Half Sweet (50%)', price: 0 },
          { id: 'opt-sug-0', name: 'No Sugar (0%)', price: 0 },
        ],
      },
    ],
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
    isAvailable: true,
    modifierGroups: [
      {
        id: 'mod-fries-size',
        title: 'Ukuran',
        type: 'single',
        required: true,
        options: [
          { id: 'opt-fsize-reg', name: 'Reguler', price: 0 },
          { id: 'opt-fsize-large', name: 'Large Share', price: 5000 },
        ],
      },
    ],
  },
  // Kategori Cup (Inventaris Khusus Cup + Harga Tambahan)
  {
    id: 'prod-cup-1',
    name: 'Cup Sealer Reguler (16 oz)',
    category: 'cup',
    price: 0,
    stock: 500,
    unit: 'Pcs',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
    description: 'Cup plastik tebal standar 16 oz dengan lid cup sealer untuk minuman dingin reguler.',
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
  },
  // Kategori Topping (Inventaris Khusus Topping Terpisah)
  {
    id: 'prod-top-1',
    name: 'Boba Pearl Brown Sugar',
    category: 'topping',
    price: 3000,
    stock: 160,
    unit: 'Porsi',
    image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
    description: 'Mutiara tapioka kenyal berbalut karamel gula aren asli dimasak segar tiap 3 jam.',
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Manager Owner Admin',
    username: 'admin',
    role: 'admin',
    avatarColor: 'bg-emerald-700',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-kasir-1',
    name: 'Siti Rahma (Kasir 1)',
    username: 'kasir1',
    role: 'kasir',
    avatarColor: 'bg-emerald-600',
    isActive: true,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'usr-kasir-2',
    name: 'Budi Santoso (Kasir 2)',
    username: 'kasir2',
    role: 'kasir',
    avatarColor: 'bg-blue-600',
    isActive: true,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
];

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'HAYPOP',
  tagline: 'Fresh Drinks & Crispy Bites',
  address: 'Jl. Boulevard Kuliner Blok A No. 12, Jakarta',
  phone: '0812-8888-9999',
  logoAlignment: 'center',
  showLogoOnReceipt: true,
  paperWidth: '58mm',
  receiptFooter: 'Terima kasih atas kunjungan Anda!\nKunjungi kami kembali untuk promo menarik.',
  receiptSocial: 'IG & TikTok: @haypop.official',
  taxPercentage: 0,
  enableTax: false,
  currency: 'Rp',
};

// Initial expenses to showcase BEP & financial transparency:
// 1. Pembelian Aset (CapEx/modal investasi awal: Mesin Cup Sealer otomatis, Freezer, Deep Fryer, POS Terminal, Renovasi Booth)
// 2. Belanja Bahan (Operational ingredients: boba, susu, sirup, ayam fillet, minyak goreng, tepung)
// 3. Gaji Karyawan (Payroll bulanan)
// 4. Operasional Lainnya (Sewa tempat harian, listrik, air, packaging cup & box)
const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-asset-1',
    date: '2026-08-01',
    category: 'pembelian_aset',
    categoryLabel: 'Pembelian Aset (CapEx)',
    amount: 14500000,
    description: 'Mesin Cup Sealer Otomatis Full Digital & Deep Fryer Double Basket Listrik',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'exp-asset-2',
    date: '2026-08-02',
    category: 'pembelian_aset',
    categoryLabel: 'Pembelian Aset (CapEx)',
    amount: 11000000,
    description: 'Under-Counter Chiller Kulkas Susu & Showcase Minuman Dingin',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-08-02T10:30:00.000Z',
  },
  {
    id: 'exp-asset-3',
    date: '2026-08-05',
    category: 'pembelian_aset',
    categoryLabel: 'Pembelian Aset (CapEx)',
    amount: 9500000,
    description: 'Interior Booth Minimalis, Neon Box HAYPOP & Sound System Kasir',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-08-05T14:15:00.000Z',
  },
  {
    id: 'exp-raw-1',
    date: '2026-09-01',
    category: 'belanja_bahan',
    categoryLabel: 'Belanja Bahan Baku',
    amount: 4200000,
    description: 'Restock Tapioca Boba Pearl (50kg), Brown Sugar Aren, Fresh Milk 100L',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'exp-raw-2',
    date: '2026-09-15',
    category: 'belanja_bahan',
    categoryLabel: 'Belanja Bahan Baku',
    amount: 3800000,
    description: 'Ayam Fillet Paha Segar (60kg), Bumbu Marinasi BBQ & Tepung Crispy',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-09-15T08:30:00.000Z',
  },
  {
    id: 'exp-salary-1',
    date: '2026-09-25',
    category: 'gaji_karyawan',
    categoryLabel: 'Gaji Karyawan',
    amount: 6000000,
    description: 'Gaji 2 Staff Kasir & Kitchen Crew Periode September',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-09-25T11:00:00.000Z',
  },
  {
    id: 'exp-ops-1',
    date: '2026-09-30',
    category: 'operasional_lainnya',
    categoryLabel: 'Operasional Harian',
    amount: 1500000,
    description: 'Listrik, Air, Gas & Kemasan Cup/Paper Bag Sablon HAYPOP',
    recordedBy: 'Manager Owner Admin',
    timestamp: '2026-09-30T16:00:00.000Z',
  },
];

// Initial recent transactions to illustrate realistic revenue & analytics
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'trx-demo-01',
    invoiceNumber: 'INV/20261001/001',
    cashierId: 'usr-kasir-1',
    cashierName: 'Siti Rahma (Kasir 1)',
    timestamp: '2026-10-01T10:15:00.000Z',
    items: [
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
    ],
    subtotal: 78000,
    discount: 0,
    tax: 0,
    totalAmount: 78000,
    paymentMethod: 'qris',
    amountPaid: 78000,
    change: 0,
    isOfflineCreated: false,
    isSynced: true,
  },
  {
    id: 'trx-demo-02',
    invoiceNumber: 'INV/20261001/002',
    cashierId: 'usr-kasir-1',
    cashierName: 'Siti Rahma (Kasir 1)',
    timestamp: '2026-10-01T11:42:00.000Z',
    items: [
      {
        productId: 'prod-food-1',
        productName: 'Crispy Popcorn Chicken Spicy BBQ',
        quantity: 2,
        unitPrice: 29000,
        totalPrice: 58000,
        modifiersSummary: ['Porsi Jumbo (250gr)', 'Level 1: Sedang', 'Cheddar Cheese Gold'],
      },
      {
        productId: 'prod-snack-1',
        productName: 'Golden French Fries Truffle Mayo',
        quantity: 1,
        unitPrice: 18000,
        totalPrice: 18000,
        modifiersSummary: ['Reguler'],
      },
    ],
    subtotal: 76000,
    discount: 0,
    tax: 0,
    totalAmount: 76000,
    paymentMethod: 'gopay',
    amountPaid: 76000,
    change: 0,
    isOfflineCreated: false,
    isSynced: true,
  },
  {
    id: 'trx-demo-03',
    invoiceNumber: 'INV/20261001/003',
    cashierId: 'usr-kasir-1',
    cashierName: 'Siti Rahma (Kasir 1)',
    timestamp: '2026-10-01T13:20:00.000Z',
    items: [
      {
        productId: 'prod-drink-1',
        productName: 'Signature Brown Sugar Boba Fresh Milk',
        quantity: 1,
        unitPrice: 24000,
        totalPrice: 24000,
        modifiersSummary: ['Reguler (16 oz)', 'Normal Sweet (100%)', 'Normal Ice'],
      },
    ],
    subtotal: 24000,
    discount: 0,
    tax: 0,
    totalAmount: 24000,
    paymentMethod: 'cash',
    amountPaid: 50000,
    change: 26000,
    isOfflineCreated: false,
    isSynced: true,
  },
];

export function getStoredProducts(): Product[] {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  // Asynchronously persist to backend SQLite database
  products.forEach((p) => {
    apiSaveProduct(p).catch(() => {});
  });
}

export function getStoredUsers(): User[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  const sanitize = (users: User[]) => users.map((u) => {
    const safe = { ...u };
    delete safe.pin;
    return safe;
  });
  if (!data) {
    const safeUsers = sanitize(INITIAL_USERS);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsers));
    return safeUsers;
  }
  try {
    const safeUsers = sanitize(JSON.parse(data));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsers));
    return safeUsers;
  } catch {
    return sanitize(INITIAL_USERS);
  }
}

export function saveStoredUsers(users: User[]): void {
  const safeUsers = users.map((u) => {
    const safe = { ...u };
    delete safe.pin;
    return safe;
  });
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsers));
  users.forEach((u) => {
    apiSaveUser(u).catch(() => {});
  });
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!data) return null;
  try {
    const user = JSON.parse(data) as User;
    delete user.pin;
    return user;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    return null;
  }
}

export function setCurrentUser(user: User): void {
  const safeUser = { ...user };
  delete safeUser.pin;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
}

export function getStoredTransactions(): Transaction[] {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransaction(trx: Transaction): void {
  const current = getStoredTransactions();
  current.unshift(trx);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(current));

  // Deduct product stock locally
  const products = getStoredProducts();
  let updated = false;
  trx.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod && prod.stock > 0) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
      updated = true;
    }
  });
  if (updated) {
    saveStoredProducts(products);
  }

  // Persist directly to backend SQLite database
  apiSaveTransaction(trx).catch(() => {
    // If backend is unreachable or offline, queue for sync
    queueOfflineTransaction(trx);
  });
}

export function getOfflineQueue(): Transaction[] {
  const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function queueOfflineTransaction(trx: Transaction): void {
  const queue = getOfflineQueue();
  queue.push(trx);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

export async function syncOfflineQueueWithDatabase(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  const res = await apiSyncBatchTransactions(queue);
  if (res.success) {
    clearOfflineQueue();
    return res.syncedCount;
  }
  return 0;
}

export function getStoredExpenses(): ExpenseRecord[] {
  const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    return INITIAL_EXPENSES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_EXPENSES;
  }
}

export function saveExpense(expense: ExpenseRecord): void {
  const list = getStoredExpenses();
  list.unshift(expense);
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
  apiSaveExpense(expense).catch(() => {});
}

export function deleteExpense(id: string): void {
  const list = getStoredExpenses().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
  apiDeleteExpense(id).catch(() => {});
}

export function getStoreSettings(): StoreSettings {
  const data = localStorage.getItem(STORAGE_KEYS.STORE_SETTINGS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  }
  try {
    return { ...INITIAL_SETTINGS, ...JSON.parse(data) };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  localStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(settings));
  apiSaveStoreSettings(settings).catch(() => {});
}

const INITIAL_PAYMENT_SETTINGS: PaymentAccountSettings = {
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

export function getPaymentAccountSettings(): PaymentAccountSettings {
  const data = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(INITIAL_PAYMENT_SETTINGS));
    return INITIAL_PAYMENT_SETTINGS;
  }
  try {
    return { ...INITIAL_PAYMENT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return INITIAL_PAYMENT_SETTINGS;
  }
}

export function savePaymentAccountSettings(settings: PaymentAccountSettings): void {
  localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(settings));
  apiSavePaymentSettings(settings).catch(() => {});
}

// Master bidirectional sync with backend SQLite database
export async function syncAllDataWithDatabase(): Promise<boolean> {
  try {
    // 1. Sync offline queue first
    await syncOfflineQueueWithDatabase();

    // 2. Fetch all fresh records from SQLite server
    const [dbProducts, dbUsers, dbTrxs, dbExpenses, dbSettings, dbPaySettings] = await Promise.all([
      apiGetProducts(),
      apiGetUsers(),
      apiGetTransactions(),
      apiGetExpenses(),
      apiGetStoreSettings(),
      apiGetPaymentSettings(),
    ]);

    if (dbProducts && dbProducts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(dbProducts));
    }
    if (dbUsers && dbUsers.length > 0) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(dbUsers));
    }
    if (dbTrxs && dbTrxs.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(dbTrxs));
    }
    if (dbExpenses && dbExpenses.length > 0) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(dbExpenses));
    }
    if (dbSettings) {
      localStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(dbSettings));
    }
    if (dbPaySettings) {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(dbPaySettings));
    }

    return true;
  } catch {
    return false;
  }
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}
