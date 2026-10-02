import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  QrCode,
  Banknote,
  Smartphone,
  Award,
} from 'lucide-react';
import { formatRupiah, getStoredTransactions, getStoredProducts } from '../utils/storage';

export const AdminAnalytics: React.FC = () => {
  const transactions = getStoredTransactions();
  const products = getStoredProducts();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.timestamp.slice(0, 10) === todayStr);
  }, [transactions, todayStr]);

  // Today stats
  const todayRevenue = todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const todayTrxCount = todayTransactions.length;
  const todayAOV = todayTrxCount > 0 ? Math.round(todayRevenue / todayTrxCount) : 0;
  const todayItemsSold = todayTransactions.reduce(
    (acc, t) => acc + t.items.reduce((iAcc, item) => iAcc + item.quantity, 0),
    0
  );

  // Peak hours distribution (09:00 - 21:00)
  const hourlyData = useMemo(() => {
    const hours: { hour: string; count: number; revenue: number }[] = [];
    for (let h = 9; h <= 21; h++) {
      const hStr = h.toString().padStart(2, '0');
      hours.push({ hour: `${hStr}:00`, count: 0, revenue: 0 });
    }

    transactions.forEach((t) => {
      const date = new Date(t.timestamp);
      const h = date.getHours();
      const idx = hours.findIndex((item) => item.hour.startsWith(h.toString().padStart(2, '0')));
      if (idx > -1) {
        hours[idx].count += 1;
        hours[idx].revenue += t.totalAmount;
      }
    });

    return hours;
  }, [transactions]);

  const maxHourCount = Math.max(1, ...hourlyData.map((h) => h.count));

  // Top selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};

    transactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!map[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          map[item.productId] = {
            name: item.productName,
            qty: 0,
            revenue: 0,
            category: prod?.category || 'menu',
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.totalPrice;
      });
    });

    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [transactions, products]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {
      qris: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      gopay: { count: 0, total: 0 },
      ovo: { count: 0, total: 0 },
      dana: { count: 0, total: 0 },
      shopeepay: { count: 0, total: 0 },
    };

    transactions.forEach((t) => {
      if (map[t.paymentMethod]) {
        map[t.paymentMethod].count += 1;
        map[t.paymentMethod].total += t.totalAmount;
      }
    });

    return map;
  }, [transactions]);

  const totalAllRevenue = transactions.reduce((a, b) => a + b.totalAmount, 0) || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Dasbor Analitik Real-Time
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Statistik performa penjualan harian, jam sibuk (peak hours), dan produk terfavorit.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          Live Data Sync Aktif
        </span>
      </div>

      {/* KPI Cards: Today performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Omset Hari Ini
          </span>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(todayRevenue)}</div>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {todayTransactions.length > 0 ? '✓ Arus kas masuk aktif' : 'Belum ada transaksi hari ini'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Transaksi Selesai
          </span>
          <div className="text-2xl font-black text-stone-900">{todayTrxCount} Pesanan</div>
          <p className="text-[11px] text-stone-400">Total struk terbit hari ini</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Rata-rata Tiket (AOV)
          </span>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(todayAOV)}</div>
          <p className="text-[11px] text-stone-400">Rata-rata belanja per customer</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Porsi / Cup Terjual
          </span>
          <div className="text-2xl font-black text-emerald-700">{todayItemsSold} Porsi</div>
          <p className="text-[11px] text-stone-400">Akumulasi minuman & makanan</p>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Distribusi Jam Sibuk Penjualan (Peak Hours)
            </h3>
            <p className="text-xs text-stone-500">Jam operasional 09:00 - 21:00</p>
          </div>
        </div>

        <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-stone-200 overflow-x-auto">
          {hourlyData.map((h, idx) => {
            const heightPct = Math.round((h.count / maxHourCount) * 100);
            return (
              <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group">
                <div className="text-[10px] font-bold text-stone-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {h.count} trx
                </div>
                <div className="w-full bg-stone-100 rounded-t-lg h-32 flex items-end p-0.5">
                  <div
                    className="w-full bg-linear-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-700 group-hover:to-teal-500 rounded-t-md transition-all duration-300"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-stone-500">{h.hour.slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Top Sellers & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Menu Paling Laris (Top Sellers)
            </h3>
            <span className="text-xs text-stone-400 font-semibold">Berdasarkan Total Porsi</span>
          </div>

          <div className="space-y-3">
            {topProducts.slice(0, 5).map((prod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-stone-900">{prod.name}</h4>
                    <span className="text-[10px] text-stone-400 uppercase font-semibold">
                      {prod.category}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-xs text-stone-900">{prod.qty} Terjual</div>
                  <div className="text-[11px] font-semibold text-emerald-700">
                    {formatRupiah(prod.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Distribusi Metode Pembayaran
          </h3>

          <div className="space-y-3 pt-1">
            {Object.entries(paymentBreakdown).map(([key, val]) => {
              const pct = Math.round((val.total / totalAllRevenue) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-stone-800 uppercase">{key}</span>
                    <span className="font-mono text-stone-600">
                      {formatRupiah(val.total)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        key === 'qris'
                          ? 'bg-red-500'
                          : key === 'cash'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
