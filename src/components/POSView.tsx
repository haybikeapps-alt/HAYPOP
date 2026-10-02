import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Sparkles,
  Coffee,
  Utensils,
  Cookie,
  Layers,
  GlassWater,
  Cherry,
  ArrowRight,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { Product, ProductCategory, CartItem, User, StoreSettings, Transaction } from '../types';
import { formatRupiah } from '../utils/storage';
import { ModifierModal } from './ModifierModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';

interface POSViewProps {
  products: Product[];
  currentUser: User;
  storeSettings: StoreSettings;
  onRefreshData?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  currentUser,
  storeSettings,
  onRefreshData,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Modals state
  const [activeCustomizingProduct, setActiveCustomizingProduct] = useState<Product | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completedTrx, setCompletedTrx] = useState<Transaction | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery && p.isAvailable;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    if (!storeSettings.enableTax) return 0;
    const taxable = subtotal - discountAmount;
    return Math.round((taxable * storeSettings.taxPercentage) / 100);
  }, [subtotal, discountAmount, storeSettings]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  // Add item to cart
  const handleAddToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === newItem.cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const nextQty = existing.quantity + newItem.quantity;
        updated[existingIdx] = {
          ...existing,
          quantity: nextQty,
          totalPrice: existing.unitPrice * nextQty,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const nextQty = item.quantity + delta;
            return {
              ...item,
              quantity: nextQty,
              totalPrice: item.unitPrice * nextQty,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  const handleProductCardClick = (product: Product) => {
    // If product has modifiers, open customization modal
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setActiveCustomizingProduct(product);
    } else {
      // Add directly
      handleAddToCart({
        cartItemId: `${product.id}_standard`,
        product,
        quantity: 1,
        selectedModifiers: [],
        unitPrice: product.price,
        totalPrice: product.price,
      });
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Menu', icon: Layers },
    { id: 'minuman', label: 'Minuman Segar', icon: Coffee },
    { id: 'makanan', label: 'Makanan & Ayam', icon: Utensils },
    { id: 'snack', label: 'Snack & Fries', icon: Cookie },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-stone-100">
      {/* LEFT: Etalase Produk — Cup & Topping dipilih saat checkout */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top Controls: Search & Category tabs */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari minuman, ayam popcorn, paket..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs sm:text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden shadow-xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick summary of items */}
            <div className="text-xs font-semibold text-stone-500">
              Menampilkan <span className="text-stone-900 font-bold">{filteredProducts.length}</span> menu tersedia
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:bg-emerald-50/50 border border-stone-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-stone-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {filteredProducts.map((prod) => {
            const hasModifiers = prod.modifierGroups && prod.modifierGroups.length > 0;
            const isOutOfStock = prod.stock <= 0;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && handleProductCardClick(prod)}
                className={`group bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  isOutOfStock ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-1'
                }`}
              >
                {/* Image & Badges */}
                <div className="relative h-44 bg-stone-200 overflow-hidden">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-80" />

                  {/* Category badge */}
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                    {prod.category}
                  </span>

                  {/* Stock count */}
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs ${
                      prod.stock < 15
                        ? 'bg-amber-500/90 text-white'
                        : 'bg-emerald-600/90 text-white'
                    }`}
                  >
                    Stok: {prod.stock}
                  </span>

                  {/* Customization label pill */}
                  {hasModifiers && (
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-emerald-200 drop-shadow-xs">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Pilihan & Varian
                      </span>
                    </div>
                  )}
                </div>

                {/* Body info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400">Harga Mulai</span>
                      <div className="font-extrabold text-base text-stone-900">
                        {formatRupiah(prod.price)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-9 h-9 rounded-2xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart & Order Drawer */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col shrink-0 shadow-lg lg:shadow-none">
        {/* Cart Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">Keranjang Pesanan</h3>
              <p className="text-[11px] text-stone-500 font-medium">
                {cart.reduce((a, b) => a + b.quantity, 0)} item dipilih
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[45vh] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-stone-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-stone-700">Keranjang Masih Kosong</p>
                <p className="text-xs text-stone-400 mt-1 max-w-[220px]">
                  Pilih menu di sebelah kiri untuk memilih ukuran, rasa, cup, dan topping.
                </p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartItemId}
                className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-stone-900 leading-snug">
                      {item.product.name}
                    </h4>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedModifiers.map((mod, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-white text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded-md"
                          >
                            {mod.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialNote && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                        Note: {item.specialNote}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.cartItemId)}
                    className="text-stone-300 hover:text-red-500 p-1 rounded-md transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                  <div className="font-extrabold text-xs text-stone-900">
                    {formatRupiah(item.totalPrice)}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-xl p-0.5">
                    <button
                      onClick={() => handleUpdateQty(item.cartItemId, -1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.cartItemId, 1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Financial Summary & Checkout Button */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200 space-y-3.5">
          {/* Discount shortcuts */}
          {cart.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-medium">Potongan / Promo Diskon:</span>
                <span className="font-bold">{discountPercent}%</span>
              </div>
              <div className="flex gap-1.5">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      discountPercent === pct
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                    }`}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtotal & Calculations */}
          <div className="space-y-1 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-stone-800">{formatRupiah(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon ({discountPercent}%)</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            {storeSettings.enableTax && (
              <div className="flex justify-between">
                <span>PPN ({storeSettings.taxPercentage}%)</span>
                <span>{formatRupiah(taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-stone-200 pt-2 flex justify-between items-baseline">
              <span className="font-extrabold text-sm text-stone-900">Total Tagihan</span>
              <span className="font-black text-xl text-emerald-700">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => setIsPaymentOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-between cursor-pointer"
          >
            <span>Bayar Sekarang ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            <div className="flex items-center gap-1.5">
              <span>{formatRupiah(grandTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeCustomizingProduct && (
        <ModifierModal
          product={activeCustomizingProduct}
          allProducts={products}
          onAddToCart={handleAddToCart}
          onClose={() => setActiveCustomizingProduct(null)}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          cart={cart}
          subtotal={subtotal}
          discount={discountAmount}
          tax={taxAmount}
          total={grandTotal}
          currentUser={currentUser}
          storeSettings={storeSettings}
          onPaymentSuccess={(newTrx) => {
            setIsPaymentOpen(false);
            setCart([]);
            setDiscountPercent(0);
            setCompletedTrx(newTrx);
            if (onRefreshData) onRefreshData();
          }}
          onClose={() => setIsPaymentOpen(false)}
        />
      )}

      {completedTrx && (
        <ReceiptModal
          transaction={completedTrx}
          storeSettings={storeSettings}
          onClose={() => setCompletedTrx(null)}
          onNewTransaction={() => setCompletedTrx(null)}
        />
      )}
    </div>
  );
};
