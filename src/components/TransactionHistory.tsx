import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Printer,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  QrCode,
  Banknote,
  Smartphone,
  Calendar,
  Lock,
} from 'lucide-react';
import { Transaction, User, StoreSettings, CustomerData } from '../types';
import { formatRupiah, getStoredTransactions } from '../utils/storage';
import { decryptCustomerData } from '../utils/crypto';
import { ReceiptModal } from './ReceiptModal';

interface TransactionHistoryProps {
  currentUser: User;
  storeSettings: StoreSettings;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  currentUser,
  storeSettings,
}) => {
  const allTransactions = getStoredTransactions();
  const isAdmin = currentUser.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'all'>('today');

  // Receipt modal for reprinting
  const [selectedReceiptTrx, setSelectedReceiptTrx] = useState<Transaction | null>(null);

  // Decryption state cache
  const [decryptedMap, setDecryptedMap] = useState<Record<string, CustomerData>>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Filter based on role and inputs
  const filteredList = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    return allTransactions.filter((trx) => {
      // Role restriction: Kasir only sees their own transactions
      if (!isAdmin && trx.cashierId !== currentUser.id) {
        return false;
      }

      // Date filter
      if (dateRange === 'today') {
        const trxDate = trx.timestamp.slice(0, 10);
        if (trxDate !== todayStr) return false;
      }

      // Payment method filter
      if (filterMethod !== 'all' && trx.paymentMethod !== filterMethod) {
        return false;
      }

      // Search query (invoice or cashier or item names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = trx.invoiceNumber.toLowerCase().includes(q);
        const matchCashier = trx.cashierName.toLowerCase().includes(q);
        const matchItems = trx.items.some((i) => i.productName.toLowerCase().includes(q));
        const matchCustomer = trx.customer?.maskedName?.toLowerCase().includes(q);
        if (!matchInvoice && !matchCashier && !matchItems && !matchCustomer) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, isAdmin, currentUser.id, dateRange, filterMethod, searchQuery]);

  const handleDecrypt = async (trx: Transaction) => {
    if (!trx.customer) return;
    if (decryptedMap[trx.id]) {
      // Toggle off
      const copy = { ...decryptedMap };
      delete copy[trx.id];
      setDecryptedMap(copy);
      return;
    }

    setDecryptingId(trx.id);
    const decrypted = await decryptCustomerData(trx.customer);
    if (decrypted) {
      setDecryptedMap((prev) => ({ ...prev, [trx.id]: decrypted }));
    }
    setDecryptingId(null);
  };

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            <QrCode className="w-3 h-3" /> QRIS
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3" /> Tunai
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase">
            <Smartphone className="w-3 h-3" /> {m}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Page Title & Scope Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-stone-900">Riwayat Transaksi Penjualan</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isAdmin
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-teal-100 text-teal-800 border border-teal-200'
              }`}
            >
              {isAdmin ? 'Semua Kasir (Admin)' : `Kasir: ${currentUser.name}`}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {!isAdmin
              ? 'Menampilkan transaksi kasir shift Anda saat ini. Struk dapat dicetak ulang kapan saja.'
              : 'Audit penuh seluruh riwayat transaksi penjualan dari semua kasir dan shift.'}
          </p>
        </div>

        {/* Total Summary of current view */}
        <div className="bg-stone-50 border border-stone-200/80 px-4 py-2.5 rounded-2xl flex items-center gap-4 text-right">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Total Omset Sesuai Filter
            </span>
            <span className="text-base font-black text-stone-900">
              {formatRupiah(filteredList.reduce((acc, t) => acc + t.totalAmount, 0))}
            </span>
          </div>
          <div className="border-l border-stone-200 pl-3">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Transaksi
            </span>
            <span className="text-base font-black text-emerald-700">{filteredList.length}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. invoice, menu, kasir..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-emerald-500 outline-hidden"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600">
          <button
            onClick={() => setDateRange('today')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
              dateRange === 'today' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
              dateRange === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            Semua Waktu
          </button>
        </div>

        {/* Payment Method Filter */}
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-emerald-500 outline-hidden font-medium text-stone-700"
        >
          <option value="all">Semua Metode Pembayaran</option>
          <option value="qris">QRIS</option>
          <option value="cash">Tunai (Cash)</option>
          <option value="transfer">Transfer Bank</option>
          <option value="gopay">GoPay</option>
          <option value="ovo">OVO</option>
          <option value="dana">DANA</option>
          <option value="shopeepay">ShopeePay</option>
        </select>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700">Belum Ada Transaksi</p>
            <p className="text-xs">Transaksi penjualan yang baru diselesaikan akan tampil di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Invoice & Waktu</th>
                  <th className="py-3.5 px-4">Kasir</th>
                  <th className="py-3.5 px-4">Item Dipesan</th>
                  <th className="py-3.5 px-4">Pelanggan (E2E)</th>
                  <th className="py-3.5 px-4">Pembayaran</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-center">Aksi Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredList.map((trx) => {
                  const isDecrypted = !!decryptedMap[trx.id];
                  const decryptedInfo = decryptedMap[trx.id];

                  return (
                    <tr key={trx.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-stone-900">{trx.invoiceNumber}</div>
                        <div className="text-[11px] text-stone-400 font-normal">
                          {new Date(trx.timestamp).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-stone-700 font-semibold">{trx.cashierName}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          {trx.items.map((item, iIdx) => (
                            <div key={iIdx} className="text-stone-800 text-[11px] leading-tight">
                              <span className="font-bold text-emerald-700">{item.quantity}x</span>{' '}
                              <span>{item.productName}</span>
                              {item.modifiersSummary && item.modifiersSummary.length > 0 && (
                                <span className="text-[10px] text-stone-500 block">
                                  ({item.modifiersSummary.join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {trx.customer ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-stone-800 font-semibold">
                                {isDecrypted
                                  ? `${decryptedInfo.name} (${decryptedInfo.phone})`
                                  : trx.customer.maskedName || 'Terenkripsi'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDecrypt(trx)}
                              disabled={decryptingId === trx.id}
                              className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {isDecrypted ? (
                                <>
                                  <EyeOff className="w-3 h-3" /> Sembunyikan
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" /> Buka Enkripsi
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">Tanpa Nama</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getMethodBadge(trx.paymentMethod)}</td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-stone-900">
                        {formatRupiah(trx.totalAmount)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReceiptTrx(trx)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 font-bold text-xs transition cursor-pointer"
                          title="Cetak Ulang Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal for Reprinting */}
      {selectedReceiptTrx && (
        <ReceiptModal
          transaction={selectedReceiptTrx}
          storeSettings={storeSettings}
          onClose={() => setSelectedReceiptTrx(null)}
          onNewTransaction={() => setSelectedReceiptTrx(null)}
        />
      )}
    </div>
  );
};
