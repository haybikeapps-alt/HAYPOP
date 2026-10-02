import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { FinancialAccount } from '../types';
import {
  FinancialExpenseRecord,
  apiGetFinancialAccounts,
  apiGetFinancialExpenseRecords,
  apiRecordAssetPurchase,
  apiRecordOperatingExpense,
  apiRecordPrive,
} from '../utils/api';
import { formatRupiah } from '../utils/storage';

type EntryType = 'operasional' | 'aset' | 'prive';

const categoryOptions = [
  { value: 'belanja_bahan', label: 'Belanja Bahan' },
  { value: 'gaji_karyawan', label: 'Gaji Karyawan' },
  { value: 'operasional_lainnya', label: 'Operasional Lainnya' },
  { value: 'promosi', label: 'Promosi / Diskon' },
] as const;

export const AdminExpenseManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [records, setRecords] = useState<FinancialExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('operasional');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<(typeof categoryOptions)[number]['value']>('operasional_lainnya');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.isActive),
    [accounts],
  );

  const totalExpense = useMemo(
    () => records.reduce((sum, record) => sum + record.amount, 0),
    [records],
  );

  const filteredRecords = useMemo(
    () => filter === 'all' ? records : records.filter((record) => record.category === filter),
    [records, filter],
  );

  const loadData = async () => {
    setLoading(true);
    const [freshAccounts, freshRecords] = await Promise.all([
      apiGetFinancialAccounts(),
      apiGetFinancialExpenseRecords(),
    ]);
    if (freshAccounts) setAccounts(freshAccounts);
    if (freshRecords) setRecords(freshRecords);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!accountId && activeAccounts[0]) {
      setAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, accountId]);

  const resetForm = () => {
    setAmount('');
    setName('');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setEntryType('operasional');
    setCategory('operasional_lainnya');
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !accountId) {
      alert('Lengkapi rekening pembayaran dan nominal pengeluaran.');
      return;
    }

    if (entryType === 'aset' && !name.trim()) {
      alert('Nama aset wajib diisi.');
      return;
    }

    setSaving(true);
    let result: { success: boolean; error?: string };

    if (entryType === 'operasional') {
      const selectedCategory = categoryOptions.find((item) => item.value === category);
      result = await apiRecordOperatingExpense({
        category,
        categoryLabel: selectedCategory?.label ?? 'Pengeluaran Operasional',
        amount: numericAmount,
        accountId,
        expenseDate: date,
        description: description.trim(),
      });
    } else if (entryType === 'aset') {
      result = await apiRecordAssetPurchase({
        name: name.trim(),
        amount: numericAmount,
        accountId,
        purchaseDate: date,
        description: description.trim(),
      });
    } else {
      result = await apiRecordPrive({
        accountId,
        amount: numericAmount,
        entryDate: new Date(date + 'T12:00:00').toISOString(),
        description: description.trim(),
      });
    }

    setSaving(false);

    if (!result.success) {
      alert(result.error || 'Pengeluaran gagal disimpan.');
      return;
    }

    resetForm();
    await loadData();
  };

  const openForm = (type: EntryType) => {
    setEntryType(type);
    setShowForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-red-500" />
            Pengeluaran
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Catat pengeluaran dari rekening tertentu. Saldo dipotong melalui ledger keuangan secara atomik.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openForm('operasional')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Pengeluaran
          </button>
          <button onClick={() => openForm('aset')} className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <BriefcaseBusiness className="w-4 h-4" /> Beli Aset
          </button>
          <button onClick={() => openForm('prive')} className="px-3 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <WalletCards className="w-4 h-4" /> Prive
          </button>
          <button onClick={() => void loadData()} disabled={loading} className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Pengeluaran</div>
          <div className="text-2xl font-black mt-2">{formatRupiah(totalExpense)}</div>
          <div className="text-[11px] text-stone-400 mt-1">{records.length} catatan</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Saldo Rekening Aktif</div>
          <div className="text-2xl font-black mt-2">
            {formatRupiah(activeAccounts.reduce((sum, account) => sum + account.balance, 0))}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">{activeAccounts.length} rekening aktif</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pembelian Aset</div>
          <div className="text-2xl font-black mt-2">
            {formatRupiah(records.filter((record) => record.source === 'asset_purchase').reduce((sum, record) => sum + record.amount, 0))}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Tidak dihitung sebagai beban operasional</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h3 className="font-extrabold text-base">Riwayat Pengeluaran</h3>
            <p className="text-xs text-stone-500 mt-1">Data diambil langsung dari Supabase, bukan localStorage.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-semibold">
            <option value="all">Semua</option>
            <option value="belanja_bahan">Belanja Bahan</option>
            <option value="gaji_karyawan">Gaji Karyawan</option>
            <option value="operasional_lainnya">Operasional Lainnya</option>
            <option value="promosi">Promosi / Diskon</option>
            <option value="pembelian_aset">Pembelian Aset</option>
            <option value="prive">Prive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-y border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Tanggal</th>
                <th className="py-3 px-5">Jenis</th>
                <th className="py-3 px-5">Keterangan</th>
                <th className="py-3 px-5">Rekening</th>
                <th className="py-3 px-5 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRecords.map((record) => (
                <tr key={record.source + record.id} className="hover:bg-stone-50">
                  <td className="py-3 px-5 whitespace-nowrap font-semibold text-stone-700">{record.date}</td>
                  <td className="py-3 px-5 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full bg-stone-100 border border-stone-200 font-bold text-[10px]">
                      {record.categoryLabel}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-stone-800">{record.description || '-'}</td>
                  <td className="py-3 px-5 whitespace-nowrap text-stone-500">{record.accountName || '—'}</td>
                  <td className="py-3 px-5 text-right whitespace-nowrap font-black text-red-600">
                    {formatRupiah(record.amount)}
                  </td>
                </tr>
              ))}
              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    Belum ada catatan pengeluaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Catat {entryType === 'operasional' ? 'Pengeluaran' : entryType === 'aset' ? 'Pembelian Aset' : 'Prive'}</h3>
                <p className="text-[11px] text-emerald-100 mt-1">Saldo rekening akan berkurang otomatis.</p>
              </div>
              <button onClick={resetForm} className="text-emerald-100 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {entryType === 'operasional' && (
                <div>
                  <label className="text-xs font-bold text-stone-700">Kategori</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold">
                    {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              )}

              {entryType === 'aset' && (
                <div>
                  <label className="text-xs font-bold text-stone-700">Nama Aset</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300" placeholder="Contoh: Freezer" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-700">Rekening Pembayaran</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold">
                    <option value="">Pilih rekening</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — {formatRupiah(account.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Nominal</label>
                <input type="number" min={1} step={1} required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold" placeholder="250000" />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Tanggal</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">{entryType === 'aset' ? 'Keterangan Aset' : 'Keterangan'}</label>
                <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" placeholder="Contoh: Pembelian untuk operasional toko" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs cursor-pointer">Batal</button>
                <button type="submit" disabled={saving || activeAccounts.length === 0} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>

              {activeAccounts.length === 0 && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Buat minimal satu rekening aktif di menu Rekening & Saldo sebelum mencatat pengeluaran.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
