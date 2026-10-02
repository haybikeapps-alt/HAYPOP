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

const CUP_OPTIONS = [
  { id: 'prod-cup-1', name: 'Cup Reguler 16 oz', price: 0 },
];

const TOPPING_OPTIONS = [
  { id: 'prod-top-1', name: 'Boba Pearl Brown Sugar', price: 3000 },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-drink-1',
    name: 'Signature Brown Sugar Boba Fresh Milk',
    category: 'minuman',
    price: 24000,
    stock: 120,
    unit: 'Cup',
    image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
    description: 'Susu segar dengan gula aren dan boba. Pilihan cup dan topping dilakukan saat checkout.',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'cup-choice',
        title: 'Pilihan Cup',
        type: 'single',
        required: true,
        options: CUP_OPTIONS,
      },
      {
        id: 'drink-sugar',
        title: 'Level Kemanisan',
        type: 'single',
        required: true,
        options: [
          { id: 'sugar-100', name: 'Normal Sweet (100%)', price: 0 },
          { id: 'sugar-70', name: 'Less Sweet (70%)', price: 0 },
          { id: 'sugar-50', name: 'Half Sweet (50%)', price: 0 },
          { id: 'sugar-0', name: 'No Sugar (0%)', price: 0 },
        ],
      },
      {
        id: 'drink-ice',
        title: 'Level Es',
        type: 'single',
        required: true,
        options: [
          { id: 'ice-normal', name: 'Normal Ice', price: 0 },
          { id: 'ice-less', name: 'Less Ice', price: 0 },
          { id: 'ice-none', name: 'No Ice', price: 0 },
        ],
      },
      {
        id: 'topping-choice',
        title: 'Topping',
        type: 'multiple',
        required: false,
        max: 1,
        options: TOPPING_OPTIONS,
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
    description: 'Ayam popcorn renyah dengan bumbu BBQ. Pilihan topping dapat ditambahkan saat checkout.',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'food-size',
        title: 'Ukuran Porsi',
        type: 'single',
        required: true,
        options: [
          { id: 'food-reg', name: 'Reguler (150gr)', price: 0 },
          { id: 'food-jumbo', name: 'Jumbo (250gr)', price: 7000 },
        ],
      },
      {
        id: 'food-spice',
        title: 'Level Kepedasan',
        type: 'single',
        required: true,
        options: [
          { id: 'spice-0', name: 'Level 0', price: 0 },
          { id: 'spice-1', name: 'Level 1', price: 0 },
          { id: 'spice-2', name: 'Level 2', price: 0 },
          { id: 'spice-3', name: 'Level 3', price: 0 },
        ],
      },
      {
        id: 'topping-choice',
        title: 'Topping / Tambahan',
        type: 'multiple',
        required: false,
        max: 1,
        options: TOPPING_OPTIONS,
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
    description: 'Kentang goreng renyah dengan truffle mayo.',
    isAvailable: true,
    modifierGroups: [
      {
        id: 'snack-size',
        title: 'Ukuran',
        type: 'single',
        required: true,
        options: [
          { id: 'snack-reg', name: 'Reguler', price: 0 },
          { id: 'snack-large', name: 'Large', price: 5000 },
        ],
      },
      {
        id: 'topping-choice',
        title: 'Topping / Tambahan',
        type: 'multiple',
        required: false,
        max: 1,
        options: TOPPING_OPTIONS,
      },
    ],
  },
  {
    id: 'prod-cup-1',
    name: 'Cup Reguler 16 oz',
    category: 'cup',
    price: 0,
    stock: 500,
    unit: 'Pcs',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
    description: 'Kemasan cup reguler yang dipilih otomatis dari checkout minuman.',
    isAvailable: true,
  },
  {
    id: 'prod-top-1',
    name: 'Boba Pearl Brown Sugar',
    category: 'topping',
    price: 3000,
    stock: 160,
    unit: 'Porsi',
    image: 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80',
    description: 'Topping boba yang tersedia langsung dari pilihan checkout.',
    isAvailable: true,
  },
  {
    id: 'prod-package-1',
    name: 'Paket HAYPOP Hemat',
    category: 'paket',
    price: 42000,
    stock: 50,
    unit: 'Paket',
    image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&auto=format&fit=crop&q=80',
    description: 'Paket demo untuk menampilkan kategori paket di etalase.',
    isAvailable: true,
  },
];

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'HAYPOP',
  tagline: 'Fresh Drinks & Crispy Bites',
  address: '',
  phone: '',
  logoAlignment: 'center',
  showLogoOnReceipt: true,
  paperWidth: '58mm',
  receiptFooter: 'Terima kasih atas kunjungan Anda!',
  receiptSocial: '',
  taxPercentage: 0,
  enableTax: false,
  currency: 'Rp',
};

const INITIAL_PAYMENT_SETTINGS: PaymentAccountSettings = {
  qris: {
    merchantName: 'HAYPOP',
    nmid: '',
    instructions: 'Gunakan QRIS toko untuk pembayaran.',
  },
  transfer: {
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    isActive: false,
  },
  ewallets: {
    gopay: { number: '', name: 'HAYPOP', isActive: false },
    ovo: { number: '', name: 'HAYPOP', isActive: false },
    dana: { number: '', name: 'HAYPOP', isActive: false },
    shopeepay: { number: '', name: 'HAYPOP', isActive: false },
  },
};

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
  products.forEach((p) => apiSaveProduct(p).catch(() => {}));
}

export function getStoredUsers(): User[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!data) return [];
  try {
    return JSON.parse(data).map((u: User) => {
      const safe = { ...u };
      delete safe.pin;
      return safe;
    });
  } catch {
    return [];
  }
}

export function saveStoredUsers(users: User[]): void {
  const safeUsers = users.map((u) => {
    const safe = { ...u };
    delete safe.pin;
    return safe;
  });
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(safeUsers));
  users.forEach((u) => apiSaveUser(u).catch(() => {}));
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
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveTransaction(trx: Transaction): void {
  const current = getStoredTransactions();
  current.unshift(trx);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(current));

  const products = getStoredProducts();
  let updated = false;
  trx.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod && prod.stock > 0) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
      updated = true;
    }
  });
  if (updated) saveStoredProducts(products);

  apiSaveTransaction(trx).catch(() => queueOfflineTransaction(trx));
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
  if (!queue.some((item) => item.id === trx.id)) {
    queue.push(trx);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }
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
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
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

export async function syncAllDataWithDatabase(): Promise<boolean> {
  try {
    await syncOfflineQueueWithDatabase();

    const [dbProducts, dbUsers, dbTrxs, dbExpenses, dbSettings, dbPaySettings] = await Promise.all([
      apiGetProducts(),
      apiGetUsers(),
      apiGetTransactions(),
      apiGetExpenses(),
      apiGetStoreSettings(),
      apiGetPaymentSettings(),
    ]);

    if (dbProducts) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(dbProducts));
    if (dbUsers) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(dbUsers));
    if (dbTrxs) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(dbTrxs));
    if (dbExpenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(dbExpenses));
    if (dbSettings) localStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(dbSettings));
    if (dbPaySettings) localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(dbPaySettings));

    return true;
  } catch {
    return false;
  }
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}
