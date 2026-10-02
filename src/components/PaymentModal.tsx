import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Building,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CartItem,
  PaymentMethod,
  Transaction,
  User,
  StoreSettings,
  CustomerData,
} from '../types';
import {
  formatRupiah,
  saveTransaction,
  queueOfflineTransaction,
  getPaymentAccountSettings,
} from '../utils/storage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PaymentModalProps {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currentUser: User;
  storeSettings: StoreSettings;
  onPaymentSuccess: (trx: Transaction) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  cart,
  subtotal,
  discount,
  tax,
  total,
  currentUser,
  storeSettings,
  onPaymentSuccess,
  onClose,
}) => {
  const isOnline = useOnlineStatus();
  const [method, setMethod] = useState<PaymentMethod>('qris');
  const paymentAccounts = getPaymentAccountSettings();

  // Customer info & E2E Encryption (Optional)
  const [copiedBank, setCopiedBank] = useState(false);

  // Cash calculation
  const [cashGiven, setCashGiven] = useState<number>(total);
  const changeAmount = Math.max(0, cashGiven - total);

  // QRIS Countdown timer (starts at 300 seconds / 5 mins)
  const [qrisTimer, setQrisTimer] = useState(300);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (method === 'qris') {
      const interval = setInterval(() => {
        setQrisTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [method]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleProcessTransaction = async (paidAmount: number) => {
    setIsProcessing(true);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV/${dateStr}/${randStr}`;

    const newTrx: Transaction = {
      id: 'trx-' + Date.now(),
      invoiceNumber,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      timestamp: now.toISOString(),
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        totalPrice: c.totalPrice,
        modifiersSummary: c.selectedModifiers.map((m) => `${m.name}`),
        note: c.specialNote,
      })),
      subtotal,
      discount,
      tax,
      totalAmount: total,
      paymentMethod: method,
      amountPaid: paidAmount,
      change: method === 'cash' ? Math.max(0, paidAmount - total) : 0,
      isOfflineCreated: !isOnline,
      isSynced: isOnline,
    };

    saveTransaction(newTrx);
    if (!isOnline) {
      queueOfflineTransaction(newTrx);
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669', '#f59e0b'],
      });
    } catch {
      // ignore
    }

    setIsProcessing(false);
    onPaymentSuccess(newTrx);
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashGiven < total) return;
    handleProcessTransaction(cashGiven);
  };

  const quickAmounts = [
    { label: 'Uang Pas', amount: total },
    { label: 'Rp 20.000', amount: 20000 },
    { label: 'Rp 50.000', amount: 50000 },
    { label: 'Rp 100.000', amount: 100000 },
    { label: 'Rp 200.000', amount: 200000 },
  ];

  const getEwalletData = (wallet: 'gopay' | 'ovo' | 'dana' | 'shopeepay') => {
    return paymentAccounts.ewallets[wallet] || { number: '0812-8888-9999', name: 'HAYPOP Official', isActive: true };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header - Light Green / Emerald */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-700/60 text-emerald-200 border border-emerald-600/40">
                Penyelesaian Transaksi Kasir
              </span>
              <span className="text-xs text-emerald-200">Kasir: {currentUser.name}</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              Total Tagihan: <span className="text-emerald-300">{formatRupiah(total)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {/* QRIS */}
              <button
                type="button"
                onClick={() => setMethod('qris')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'qris'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <QrCode className="w-5 h-5 text-red-600" />
                <span className="text-xs">QRIS</span>
              </button>

              {/* Cash */}
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Tunai</span>
              </button>

              {/* Bank Transfer */}
              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'transfer'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Transfer</span>
              </button>

              {/* GoPay */}
              <button
                type="button"
                onClick={() => setMethod('gopay')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'gopay'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                  G
                </div>
                <span className="text-xs">GoPay</span>
              </button>

              {/* OVO */}
              <button
                type="button"
                onClick={() => setMethod('ovo')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'ovo'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center">
                  O
                </div>
                <span className="text-xs">OVO</span>
              </button>

              {/* DANA */}
              <button
                type="button"
                onClick={() => setMethod('dana')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'dana'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center">
                  D
                </div>
                <span className="text-xs">DANA</span>
              </button>

              {/* ShopeePay */}
              <button
                type="button"
                onClick={() => setMethod('shopeepay')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  method === 'shopeepay'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center">
                  S
                </div>
                <span className="text-xs">Shopee</span>
              </button>
            </div>
          </div>

          {/* TAB 1: QRIS INSTANT DISPLAY (Pre-configured from settings) */}
          {method === 'qris' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded tracking-widest">
                  QRIS
                </span>
                <span className="text-xs text-stone-600 font-bold">
                  {paymentAccounts.qris.merchantName}
                </span>
              </div>

              {/* If custom image uploaded by admin, show it. Otherwise show dynamic QRIS */}
              <div className="inline-block p-4 bg-white rounded-2xl border-2 border-stone-300 shadow-inner">
                {paymentAccounts.qris.qrImageDataUrl ? (
                  <img
                    src={paymentAccounts.qris.qrImageDataUrl}
                    alt="QRIS Toko"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                ) : (
                  <svg
                    className="w-48 h-48 mx-auto"
                    viewBox="0 0 160 160"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="160" height="160" fill="white" />
                    <rect x="10" y="10" width="40" height="40" rx="4" fill="black" />
                    <rect x="18" y="18" width="24" height="24" rx="2" fill="white" />
                    <rect x="22" y="22" width="16" height="16" fill="black" />

                    <rect x="110" y="10" width="40" height="40" rx="4" fill="black" />
                    <rect x="118" y="18" width="24" height="24" rx="2" fill="white" />
                    <rect x="122" y="22" width="16" height="16" fill="black" />

                    <rect x="10" y="110" width="40" height="40" rx="4" fill="black" />
                    <rect x="18" y="118" width="24" height="24" rx="2" fill="white" />
                    <rect x="22" y="122" width="16" height="16" fill="black" />

                    <rect x="60" y="20" width="8" height="8" fill="black" />
                    <rect x="75" y="15" width="8" height="8" fill="black" />
                    <rect x="90" y="25" width="8" height="8" fill="black" />
                    <rect x="60" y="40" width="8" height="8" fill="black" />
                    <rect x="80" y="45" width="8" height="8" fill="black" />
                    <rect x="95" y="38" width="8" height="8" fill="black" />

                    <rect x="20" y="60" width="8" height="8" fill="black" />
                    <rect x="35" y="75" width="8" height="8" fill="black" />
                    <rect x="20" y="90" width="8" height="8" fill="black" />
                    <rect x="40" y="95" width="8" height="8" fill="black" />

                    <rect x="60" y="65" width="10" height="10" fill="black" />
                    <rect x="80" y="65" width="10" height="10" fill="black" />
                    <rect x="70" y="80" width="15" height="15" fill="black" />
                    <rect x="90" y="85" width="8" height="8" fill="black" />
                    <rect x="60" y="95" width="8" height="8" fill="black" />

                    <rect x="115" y="60" width="8" height="8" fill="black" />
                    <rect x="135" y="70" width="8" height="8" fill="black" />
                    <rect x="115" y="85" width="8" height="8" fill="black" />
                    <rect x="130" y="95" width="8" height="8" fill="black" />

                    <rect x="60" y="115" width="8" height="8" fill="black" />
                    <rect x="80" y="120" width="8" height="8" fill="black" />
                    <rect x="70" y="135" width="8" height="8" fill="black" />
                    <rect x="95" y="130" width="8" height="8" fill="black" />

                    <rect x="115" y="115" width="8" height="8" fill="black" />
                    <rect x="135" y="125" width="8" height="8" fill="black" />
                    <rect x="120" y="138" width="8" height="8" fill="black" />

                    <rect x="66" y="66" width="28" height="28" rx="4" fill="white" />
                    <rect x="70" y="70" width="20" height="20" rx="3" fill="#10b981" />
                    <text x="80" y="84" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                      HP
                    </text>
                  </svg>
                )}

                <div className="mt-2 text-xs font-bold text-stone-800">
                  NMID: {paymentAccounts.qris.nmid}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Batas Waktu: <strong className="text-stone-900">{formatTimer(qrisTimer)}</strong>
                </span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-700 font-bold">
                  Nominal: <strong className="text-emerald-700">{formatRupiah(total)}</strong>
                </span>
              </div>

              {/* 1-Click Cashier Confirm */}
              <button
                type="button"
                onClick={() => handleProcessTransaction(total)}
                disabled={isProcessing}
                className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>Konfirmasi QRIS Berhasil Diterima</span>
              </button>
            </div>
          )}

          {/* TAB 2: CASH (TUNAI) */}
          {method === 'cash' && (
            <form onSubmit={handleCashSubmit} className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    Nominal Uang Tunai Diterima
                  </span>
                  <span className="text-xs font-bold text-stone-900">
                    Tagihan: {formatRupiah(total)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-stone-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={cashGiven || ''}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-300 font-mono text-xl font-bold text-stone-900 focus:border-emerald-500 outline-hidden"
                    placeholder="0"
                  />
                </div>

                {/* Quick cash shortcuts */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickAmounts.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashGiven(q.amount)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-stone-700 transition cursor-pointer"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Box */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                  cashGiven >= total
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-stone-500">
                    {cashGiven >= total ? 'Kembalian Pelanggan' : 'Uang Kurang'}
                  </div>
                  <div className="text-2xl font-black mt-0.5">
                    {cashGiven >= total
                      ? formatRupiah(changeAmount)
                      : `- ${formatRupiah(total - cashGiven)}`}
                  </div>
                </div>

                {cashGiven >= total ? (
                  <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full">
                    Siap Selesai
                  </span>
                ) : (
                  <span className="bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full">
                    Kurang Uang
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={cashGiven < total || isEncrypting}
                className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Selesaikan Pembayaran Tunai & Cetak Struk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: TRANSFER BANK (Pre-configured from settings) */}
          {method === 'transfer' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900">
                    Transfer Bank: {paymentAccounts.transfer.bankName}
                  </h4>
                  <p className="text-xs text-stone-500">
                    Tunjukkan nomor rekening resmi toko ini kepada pelanggan
                  </p>
                </div>
              </div>

              {/* Account Details Box with 1-click copy */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                <div className="text-xs text-stone-500">Nomor Rekening Toko:</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-black text-stone-900 tracking-wider">
                    {paymentAccounts.transfer.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(paymentAccounts.transfer.accountNumber)}
                    className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBank ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <div className="text-xs text-stone-600 pt-1 border-t border-stone-100">
                  Atas Nama: <strong>{paymentAccounts.transfer.accountHolder}</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-semibold">Total Tagihan Masuk:</span>
                <span className="font-black text-emerald-900 text-base">{formatRupiah(total)}</span>
              </div>

              <button
                type="button"
                onClick={() => handleProcessTransaction(total)}
                disabled={isProcessing || isEncrypting}
                className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>Konfirmasi Transfer Bank Diterima</span>
              </button>
            </div>
          )}

          {/* TAB 4: E-WALLETS (GoPay, OVO, DANA, ShopeePay) - AUTOMATIC DISPLAY */}
          {(method === 'gopay' || method === 'ovo' || method === 'dana' || method === 'shopeepay') && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
              {(() => {
                const wData = getEwalletData(method);
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-xs">
                        <Smartphone className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-stone-900 uppercase">
                          Akun {method} Toko
                        </h4>
                        <p className="text-xs text-stone-500">
                          Pelanggan dapat langsung transfer ke akun resmi toko berikut
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                      <div className="text-xs text-stone-500">Nomor {method.toUpperCase()} Toko:</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lg font-black text-stone-900">
                          {wData.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(wData.number)}
                          className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBank ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                      <div className="text-xs text-stone-600 pt-1 border-t border-stone-100">
                        Atas Nama: <strong>{wData.name}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-semibold">Total Tagihan:</span>
                      <span className="font-black text-emerald-900 text-base">{formatRupiah(total)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProcessTransaction(total)}
                      disabled={isProcessing || isEncrypting}
                      className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Konfirmasi Pembayaran {method.toUpperCase()} Selesai</span>
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
