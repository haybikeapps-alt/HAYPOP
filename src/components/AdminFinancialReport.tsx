import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  ShoppingBag,
  Users,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, Transaction } from '../types';
import {
  getStoredExpenses,
  saveExpense,
  deleteExpense,
  getStoredTransactions,
  formatRupiah,
} from '../utils/storage';

export const AdminFinancialReport: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => getStoredExpenses());
  const transactions = getStoredTransactions();

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('belanja_bahan');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Filter
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Calculations
  const totalRevenue = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  }, [transactions]);

  // Breakdown 4 categories
  const assetExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'pembelian_aset')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const rawMaterialExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'belanja_bahan')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const salaryExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'gaji_karyawan')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const otherOpsExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'operasional_lainnya')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  // Total Operational Expenses (excluding asset investment CapEx)
  const totalOperationalExpenses = rawMaterialExpenses + salaryExpenses + otherOpsExpenses;

  // Total All Expenses (including asset purchases)
  const totalAllExpenses = assetExpenses + totalOperationalExpenses;

  // Operating Net Profit (Pemasukan - Pengeluaran Operasional)
  const operatingNetProfit = totalRevenue - totalOperationalExpenses;

  // BEP Calculation
  // BEP Tercapai jika Laba Operasional Kumulatif >= Total Investasi Pembelian Aset
  const bepPercent = assetExpenses > 0
    ? Math.min(100, Math.max(0, Math.round((operatingNetProfit / assetExpenses) * 100)))
    : 100;

  const isBEPAchieved = operatingNetProfit >= assetExpenses && assetExpenses > 0;
  const remainingToBEP = Math.max(0, assetExpenses - operatingNetProfit);

  // Group monthly for visualization
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { label: string; revenue: number; expense: number; profit: number }> = {
      '2026-08': { label: 'Agustus 2026', revenue: 15400000, expense: 35000000, profit: -19600000 },
      '2026-09': { label: 'September 2026', revenue: 28500000, expense: 15500000, profit: 13000000 },
      '2026-10': { label: 'Oktober 2026', revenue: totalRevenue + 12000000, expense: 7800000, profit: totalRevenue + 4200000 },
    };

    return Object.values(monthsMap);
  }, [totalRevenue]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const labelMap: Record<ExpenseCategory, string> = {
      pembelian_aset: 'Pembelian Aset (CapEx)',
      belanja_bahan: 'Belanja Bahan Baku',
      gaji_karyawan: 'Gaji Karyawan',
      operasional_lainnya: 'Operasional Harian',
    };

    const newExp: ExpenseRecord = {
      id: 'exp-' + Date.now(),
      date: expenseDate,
      category,
      categoryLabel: labelMap[category],
      amount: numAmount,
      description: description.trim() || 'Pengeluaran operasional toko',
      recordedBy: 'Admin',
      timestamp: new Date().toISOString(),
    };

    saveExpense(newExp);
    setExpenses(getStoredExpenses());

    // Reset
    setAmount('');
    setDescription('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus catatan pengeluaran ini?')) {
      deleteExpense(id);
      setExpenses(getStoredExpenses());
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    return filterCategory === 'all' || e.category === filterCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Laporan Keuangan & Analisis BEP Bisnis
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Arus kas sederhana & transparan: memantau pembelian aset, belanja bahan baku, gaji, dan akumulasi omset harian.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* 4 Pilar Arus Kas Sederhana (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pemasukan */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            {transactions.length} transaksi penjualan
          </div>
        </div>

        {/* Belanja Bahan */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Belanja Bahan Baku
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(rawMaterialExpenses)}</div>
          <p className="text-[11px] text-stone-500">Boba, susu, ayam, bumbu & sirup</p>
        </div>

        {/* Gaji Karyawan */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Gaji Karyawan
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(salaryExpenses)}</div>
          <p className="text-[11px] text-stone-500">Payroll staf kasir & barista</p>
        </div>

        {/* Pembelian Aset CapEx */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Pembelian Aset (CapEx)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(assetExpenses)}</div>
          <p className="text-[11px] text-stone-500">Mesin sealer, freezer, booth & POS</p>
        </div>
      </div>

      {/* BEP (BREAK-EVEN POINT) FULL-TIME ANALYZER CARD */}
      <div className="bg-linear-to-br from-stone-900 via-stone-800 to-black text-white p-6 sm:p-7 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
        {/* Glow effect in background */}
        <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full inline-block mb-2">
              Full-Time Break-Even Analysis
            </span>
            <h3 className="text-2xl font-black text-white flex items-center gap-2">
              Status Balik Modal (BEP) Bisnis HAYPOP
            </h3>
            <p className="text-xs text-stone-400 max-w-xl mt-1">
              Perhitungan membandingkan akumulasi laba operasional bersih dengan seluruh modal pembelian aset awal (CapEx).
            </p>
          </div>

          <div className="text-right">
            <span
              className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border inline-block ${
                isBEPAchieved
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isBEPAchieved ? '🎉 SUDAH BEP (PROFIT MURNI)' : `PROSES BEP (${bepPercent}%)`}
            </span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-stone-300">Progres Laba Menutup Modal Aset:</span>
            <span className="text-emerald-400 font-mono text-sm">{bepPercent}%</span>
          </div>
          <div className="w-full h-4 bg-stone-700/80 rounded-full overflow-hidden p-0.5 border border-stone-600">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isBEPAchieved
                  ? 'bg-linear-to-r from-emerald-500 to-teal-400'
                  : 'bg-linear-to-r from-teal-500 via-emerald-400 to-green-300'
              }`}
              style={{ width: `${Math.max(5, bepPercent)}%` }}
            />
          </div>
        </div>

        {/* 3 Metric Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 relative z-10 border-t border-stone-800">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-stone-400 font-semibold block">Total Investasi Aset (CapEx)</span>
            <span className="text-lg font-black text-white mt-1 block">{formatRupiah(assetExpenses)}</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-stone-400 font-semibold block">Akumulasi Laba Operasional</span>
            <span
              className={`text-lg font-black mt-1 block ${
                operatingNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatRupiah(operatingNetProfit)}
            </span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[11px] text-stone-400 font-semibold block">
              {isBEPAchieved ? 'Keuntungan Bersih Berkelanjutan' : 'Sisa Omzet/Laba Menuju BEP'}
            </span>
            <span className="text-lg font-black text-amber-300 mt-1 block">
              {isBEPAchieved ? 'Surplus ' + formatRupiah(operatingNetProfit - assetExpenses) : formatRupiah(remainingToBEP)}
            </span>
          </div>
        </div>
      </div>

      {/* MONTHLY PROFIT & LOSS VISUALIZATION CHART */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Grafik Progres Arus Kas & Laba Rugi Bulanan
            </h3>
            <p className="text-xs text-stone-500">
              Perbandingan historis pemasukan vs pengeluaran operasional per bulan.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Pemasukan
            </span>
            <span className="flex items-center gap-1.5 text-stone-600">
              <span className="w-3 h-3 rounded-sm bg-stone-400 inline-block" /> Pengeluaran
            </span>
          </div>
        </div>

        {/* Interactive Bar Chart Visualization */}
        <div className="space-y-4 pt-2">
          {monthlyData.map((m, idx) => {
            const maxVal = 40000000;
            const revPct = Math.min(100, Math.round((m.revenue / maxVal) * 100));
            const expPct = Math.min(100, Math.round((m.expense / maxVal) * 100));

            return (
              <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-stone-900">{m.label}</span>
                  <span
                    className={`font-black ${
                      m.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    Laba Bersih: {formatRupiah(m.profit)}
                  </span>
                </div>

                {/* Dual Bars */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-400 w-16 text-right">Pemasukan</span>
                    <div className="flex-1 h-3.5 bg-stone-200 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-md transition-all duration-500"
                        style={{ width: `${revPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 w-24 text-right">
                      {formatRupiah(m.revenue)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-stone-400 w-16 text-right">Pengeluaran</span>
                    <div className="flex-1 h-3.5 bg-stone-200 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-stone-400 rounded-md transition-all duration-500"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-stone-600 w-24 text-right">
                      {formatRupiah(m.expense)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXPENSE LOGS & TABLE */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Rincian Catatan Pengeluaran</h3>
            <p className="text-xs text-stone-500">Riwayat pengeluaran operasional dan investasi aset toko</p>
          </div>

          {/* Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-500 outline-hidden font-medium text-stone-700"
          >
            <option value="all">Semua Kategori Pengeluaran</option>
            <option value="pembelian_aset">Pembelian Aset (CapEx)</option>
            <option value="belanja_bahan">Belanja Bahan Baku</option>
            <option value="gaji_karyawan">Gaji Karyawan</option>
            <option value="operasional_lainnya">Operasional Harian</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Keterangan / Rincian</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-stone-50 transition">
                  <td className="py-3 px-4 whitespace-nowrap text-stone-700 font-semibold">
                    {exp.date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        exp.category === 'pembelian_aset'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : exp.category === 'belanja_bahan'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : exp.category === 'gaji_karyawan'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      {exp.categoryLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-800">{exp.description}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-black text-stone-900">
                    {formatRupiah(exp.amount)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-stone-300 hover:text-red-600 p-1 rounded-md transition cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE FORM */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">Catat Pengeluaran Baru</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold text-stone-800 focus:border-emerald-500 outline-hidden"
                >
                  <option value="belanja_bahan">Belanja Bahan Baku (Susu, Boba, Ayam)</option>
                  <option value="pembelian_aset">Pembelian Aset (CapEx Mesin, Interior, POS)</option>
                  <option value="gaji_karyawan">Gaji Karyawan</option>
                  <option value="operasional_lainnya">Operasional Harian (Listrik, Gas, Cup)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Nominal Pengeluaran</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Contoh: 250000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 font-mono text-sm font-bold text-stone-900 focus:border-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Tanggal</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Keterangan / Item</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Beli boba pearl 20kg + gula aren murni"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
