export type UserRole = 'admin' | 'kasir';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatarColor?: string;
  isActive: boolean;
  createdAt: string;
}

export type ProductCategory = 'minuman' | 'makanan' | 'snack' | 'cup' | 'topping' | 'paket';

export interface ModifierOption {
  id: string;
  name: string;
  price: number; // additional price (can be 0)
}

export interface ModifierGroup {
  id: string;
  title: string;
  type: 'single' | 'multiple'; // single (radio: cup size, sweetness, spiciness) or multiple (checkbox: toppings)
  required?: boolean;
  min?: number;
  max?: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  unit: string;
  image: string;
  description: string;
  modifierGroups?: ModifierGroup[];
  isAvailable: boolean;
}

export interface SelectedModifier {
  groupId: string;
  groupTitle: string;
  optionId: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // unique per configuration
  product: Product;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  unitPrice: number; // base price + modifier prices
  totalPrice: number;
  specialNote?: string;
}

export type PaymentMethod = 'qris' | 'cash' | 'transfer' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';

export interface PaymentAccountSettings {
  qris: {
    merchantName: string;
    nmid: string;
    qrImageDataUrl?: string;
    instructions: string;
  };
  transfer: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isActive: boolean;
  };
  ewallets: {
    gopay: { number: string; name: string; isActive: boolean };
    ovo: { number: string; name: string; isActive: boolean };
    dana: { number: string; name: string; isActive: boolean };
    shopeepay: { number: string; name: string; isActive: boolean };
  };
}

export interface EncryptedCustomerData {
  encryptedPayload: string;
  iv: string;
  isEncrypted: boolean;
  maskedName?: string;
  maskedPhone?: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  tableOrOrderNumber?: string;
  notes?: string;
}

export interface OrderItemRecord {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiersSummary: string[];
  note?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  cashierId: string;
  cashierName: string;
  timestamp: string; // ISO string
  items: OrderItemRecord[];
  subtotal: number;
  discount: number;
  tax: number; // PPN if any
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  customer?: EncryptedCustomerData;
  isOfflineCreated?: boolean;
  isSynced?: boolean;
  syncTimestamp?: string;
}

export type ExpenseCategory = 'pembelian_aset' | 'belanja_bahan' | 'gaji_karyawan' | 'operasional_lainnya';

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  categoryLabel: string;
  amount: number;
  description: string;
  recordedBy: string;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  logoDataUrl?: string; // base64 uploaded logo
  logoAlignment: 'left' | 'center' | 'right';
  showLogoOnReceipt: boolean;
  paperWidth: '58mm' | '80mm';
  receiptFooter: string;
  receiptSocial: string;
  taxPercentage: number; // default 0% or 11%
  enableTax: boolean;
  currency: string;
}

export interface BluetoothPrinterConfig {
  deviceName?: string;
  connected: boolean;
  paperWidth: '58mm' | '80mm';
}
