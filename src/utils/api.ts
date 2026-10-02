import {
  Product,
  User,
  Transaction,
  ExpenseRecord,
  StoreSettings,
  PaymentAccountSettings,
} from '../types';
import { supabase } from '../lib/supabase';

function mapProfile(row: any): User {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    username: String(row.username ?? ''),
    role: row.role === 'admin' ? 'admin' : 'kasir',
    avatarColor: row.avatar_color ?? undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapProduct(row: any): Product {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    category: row.category,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    unit: String(row.unit ?? ''),
    image: String(row.image ?? ''),
    description: String(row.description ?? ''),
    modifierGroups: row.modifier_groups ?? [],
    isAvailable: Boolean(row.is_available),
  };
}

function mapTransaction(row: any): Transaction {
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number ?? ''),
    cashierId: String(row.cashier_id ?? ''),
    cashierName: String(row.cashier_name ?? ''),
    timestamp: String(row.timestamp ?? row.created_at ?? ''),
    items: row.items ?? [],
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    tax: Number(row.tax ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    paymentMethod: row.payment_method,
    amountPaid: Number(row.amount_paid ?? 0),
    change: Number(row.change ?? 0),
    customer: row.customer_snapshot ?? undefined,
    isSynced: Boolean(row.is_synced),
    syncTimestamp: row.sync_timestamp ?? undefined,
  };
}

function mapExpense(row: any): ExpenseRecord {
  return {
    id: String(row.id),
    date: String(row.date),
    category: row.category,
    categoryLabel: String(row.category_label ?? ''),
    amount: Number(row.amount ?? 0),
    description: String(row.description ?? ''),
    recordedBy: String(row.recorded_by_name ?? ''),
    timestamp: String(row.timestamp ?? ''),
  };
}

export async function apiLogin(email: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, username, role, avatar_color, is_active, created_at')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      await supabase.auth.signOut();
      return null;
    }

    return mapProfile(profile);
  } catch {
    return null;
  }
}

export async function apiGetCurrentUser(): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, username, role, avatar_color, is_active, created_at')
      .eq('id', session.user.id)
      .single();

    if (error || !profile || !profile.is_active) {
      await supabase.auth.signOut();
      return null;
    }

    return mapProfile(profile);
  } catch {
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  await supabase.auth.signOut();
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

export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const [products, users, transactions, expenses] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('expenses').select('id', { count: 'exact', head: true }),
    ]);

    const error = products.error || users.error || transactions.error || expenses.error;
    if (error) throw error;

    return {
      status: 'connected',
      engine: 'Supabase PostgreSQL',
      databaseFile: 'Supabase managed database',
      isPersistent: true,
      counts: {
        products: products.count ?? 0,
        users: users.count ?? 0,
        transactions: transactions.count ?? 0,
        expenses: expenses.count ?? 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      status: 'disconnected',
      engine: 'Supabase PostgreSQL',
      databaseFile: 'Supabase managed database',
      isPersistent: true,
    };
  }
}

export async function apiGetProducts(): Promise<Product[] | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category')
    .order('name');
  return error ? null : (data ?? []).map(mapProduct);
}

export async function apiSaveProduct(product: Product): Promise<boolean> {
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    image: product.image,
    description: product.description,
    modifier_groups: product.modifierGroups ?? [],
    is_available: product.isAvailable,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function apiDeleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return !error;
}

export async function apiGetUsers(): Promise<User[] | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, role, avatar_color, is_active, created_at')
    .order('role')
    .order('name');
  return error ? null : (data ?? []).map(mapProfile);
}

export async function apiSaveUser(user: User): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(user.id)) return false;
  const { error } = await supabase
    .from('profiles')
    .update({
      name: user.name,
      username: user.username.trim().toLowerCase(),
      role: user.role,
      avatar_color: user.avatarColor ?? null,
      is_active: user.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  return !error;
}

export async function apiDeleteUser(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function apiGetTransactions(): Promise<Transaction[] | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('timestamp', { ascending: false });
  return error ? null : (data ?? []).map(mapTransaction);
}

function transactionRpcPayload(transaction: Transaction, userId: string) {
  return {
    id: transaction.id,
    invoice_number: transaction.invoiceNumber,
    cashier_id: userId,
    cashier_name: transaction.cashierName,
    timestamp: transaction.timestamp,
    items: transaction.items,
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: transaction.tax,
    total_amount: transaction.totalAmount,
    payment_method: transaction.paymentMethod,
    amount_paid: transaction.amountPaid,
    change: transaction.change,
    customer_snapshot: transaction.customer ?? null,
  };
}

export async function apiSaveTransaction(transaction: Transaction): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== transaction.cashierId) return false;

  const { data, error } = await supabase.rpc('create_transaction_with_stock', {
    p_transaction: transactionRpcPayload(transaction, user.id),
  });

  return !error && data === true;
}

export async function apiSyncBatchTransactions(transactions: Transaction[]): Promise<{ success: boolean; syncedCount: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, syncedCount: 0 };

  const ownTransactions = transactions.filter((transaction) => transaction.cashierId === user.id);
  if (ownTransactions.length === 0) return { success: true, syncedCount: 0 };

  let syncedCount = 0;
  for (const transaction of ownTransactions) {
    const { data, error } = await supabase.rpc('create_transaction_with_stock', {
      p_transaction: transactionRpcPayload(transaction, user.id),
    });

    if (error || data !== true) {
      return { success: false, syncedCount };
    }

    syncedCount += 1;
  }

  return { success: true, syncedCount };
}

export async function apiGetExpenses(): Promise<ExpenseRecord[] | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });
  return error ? null : (data ?? []).map(mapExpense);
}

export async function apiSaveExpense(expense: ExpenseRecord): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('expenses').upsert({
    id: expense.id,
    date: expense.date,
    category: expense.category,
    category_label: expense.categoryLabel,
    amount: expense.amount,
    description: expense.description,
    recorded_by: user.id,
    recorded_by_name: expense.recordedBy,
    timestamp: expense.timestamp,
  });
  return !error;
}

export async function apiDeleteExpense(id: string): Promise<boolean> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  return !error;
}

async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  return data.value as T;
}

async function saveSetting(key: string, value: unknown): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  return !error;
}

export async function apiGetStoreSettings(): Promise<StoreSettings | null> {
  return getSetting<StoreSettings>('store_settings');
}

export async function apiSaveStoreSettings(settings: StoreSettings): Promise<boolean> {
  return saveSetting('store_settings', settings);
}

export async function apiGetPaymentSettings(): Promise<PaymentAccountSettings | null> {
  return getSetting<PaymentAccountSettings>('payment_settings');
}

export async function apiSavePaymentSettings(settings: PaymentAccountSettings): Promise<boolean> {
  return saveSetting('payment_settings', settings);
}
