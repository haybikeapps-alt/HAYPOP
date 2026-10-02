import {
  Product,
  User,
  Transaction,
  ExpenseRecord,
  StoreSettings,
  PaymentAccountSettings,
} from '../types';

export async function apiLogin(username: string, pin: string): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function apiGetCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort logout; local auth state is cleared regardless.
  }
}

export interface DatabaseStatus {
  status: 'connected' | 'disconnected';
  engine: string;
  databaseFile: string;
  isPersistent: boolean;
  counts?: {
    products: number;
    users: number;
    transactions: number;
    expenses: number;
  };
  timestamp?: string;
}

// 1. Status Check
export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const res = await fetch('/api/database/status');
    if (!res.ok) throw new Error('Database response not ok');
    return await res.json();
  } catch {
    return {
      status: 'disconnected',
      engine: 'SQLite (Offline Mode / Local Cache)',
      databaseFile: 'data/haypop.sqlite',
      isPersistent: true,
    };
  }
}

// 2. Products
export async function apiGetProducts(): Promise<Product[] | null> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiSaveProduct(product: Product): Promise<boolean> {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiDeleteProduct(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 3. Users
export async function apiGetUsers(): Promise<User[] | null> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiSaveUser(user: User): Promise<boolean> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiDeleteUser(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 4. Transactions
export async function apiGetTransactions(): Promise<Transaction[] | null> {
  try {
    const res = await fetch('/api/transactions');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiSaveTransaction(transaction: Transaction): Promise<boolean> {
  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiSyncBatchTransactions(transactions: Transaction[]): Promise<{ success: boolean; syncedCount: number }> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    });
    if (!res.ok) return { success: false, syncedCount: 0 };
    return await res.json();
  } catch {
    return { success: false, syncedCount: 0 };
  }
}

// 5. Expenses
export async function apiGetExpenses(): Promise<ExpenseRecord[] | null> {
  try {
    const res = await fetch('/api/expenses');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiSaveExpense(expense: ExpenseRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiDeleteExpense(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 6. Settings
export async function apiGetStoreSettings(): Promise<StoreSettings | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function apiSaveStoreSettings(settings: StoreSettings): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 7. Payment Settings
export async function apiGetPaymentSettings(): Promise<PaymentAccountSettings | null> {
  try {
    const res = await fetch('/api/payment-settings');
    if (!res.ok) return null;
    const data = await res.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function apiSavePaymentSettings(settings: PaymentAccountSettings): Promise<boolean> {
  try {
    const res = await fetch('/api/payment-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}
