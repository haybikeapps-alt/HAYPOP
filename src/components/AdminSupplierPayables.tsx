import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Plus,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { FinancialAccount, SupplierPayableRecord } from '../types';
import {
  apiCreateSupplierPayable,
  apiGetFinancialAccounts,
  apiGetSupplierPayables,
  apiRecordSupplierPayment,
} from '../utils/api';
import { formatRupiah } from '../utils/storage';

export const AdminSupplierPayables: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [records, setRecords] = useState<SupplierPayableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<'create' | 'payment' | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedPayable, setSelectedPayable] = useState<SupplierPayableRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);
  const outstandingTotal = useMemo(
    () => records.filter((record) => record.status !== 'paid').reduce((sum, record) => sum + record.outstandingAmount, 0),
    [records],
  );
  const totalPayable = useMemo(
    () => records.reduce((sum, record) => sum + record.totalAmount, 0),
    [records],
  );

  const filteredRecords = useMemo(
    () => filter === 'all' ? records : records.filter((record) => record.status === filter),
    [records, filter],
  );

  const loadData = async () => {
    setLoading(true);
    const [freshSuppliers, freshAccounts, freshRecords] = await Promise.all([
      apiGetSupplierOptions(),
      apiGetFinancialAccounts(),
      apiGetSupplierPayables(),
    ]);
    if (freshSuppliers) setSuppliers(freshSuppliers);
    if (freshAccounts) setAccounts(freshAccounts);
    if (freshRecords) setRecords(freshRecords);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!supplierId && suppliers[0]) setSupplierId(suppliers[0].id);
  }, [suppliers, supplierId]);

  useEffect(() => {
    if (!paymentAccountId && activeAccounts[0]) setPaymentAccountId(activeAccounts[0].id);
  }, [activeAccounts, paymentAccountId]);

  const resetForm = () => {
    setForm(null);
    setTotalAmount('');
    setReferenceNumber('');
    setDescription('');
    setDueDate('');
    setPaymentAmount('');
    setPaymentNotes('');
    setSelectedPayable(null);
  };

  const openPayment = (record: SupplierPayableRecord) => {
    setSelectedPayable(record);
    setPaymentAmount(String(record.outstandingAmount));
    setPaymentNotes('');
    setForm('payment');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(totalAmount);
    if (!supplierId || !amount || amount <= 0) {
      alert('Pilih supplier dan isi total hutang yang valid.');
      return;
    }

    setSaving(true);
    const result = await apiCreateSupplierPayable({
      supplierId,
      totalAmount: amount,
      referenceNumber,
      description,
      dueDate: dueDate || null,
    });
    setSaving(false);

    if (!result.success) {
      alert(result.error || 'Hutang supplier gagal disimpan.');
      return;
    }

    resetForm();
    await loadData();
  };

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPayable || !paymentAccountId) {
      alert('Pilih hutang dan rekening pembayaran.');
      return;
    }

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Nominal pembayaran harus lebih besar dari nol.');
      return;
    }
    if (amount > selectedPayable.outstandingAmount) {
      alert('Pembayaran tidak boleh melebihi sisa hutang.');
      return;
    }

    setSaving(true);
    const result = await apiRecordSupplierPayment({
      payableId: selectedPayable.id,
      accountId: paymentAccountId,
      amount,
      notes: paymentNotes,
    });
    setSaving(false);

    if (!result.success) {
      alert(result.error || 'Pembayaran hutang gagal disimpan.');
      return;
    }

    resetForm();
    await loadData();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Hutang Supplier
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Catat hutang supplier dan bayar secara bertahap dari rekening keuangan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setForm('create')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Hutang Baru
          </button>
          <button onClick={() => void loadData()} disabled={loading} className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Hutang</div>
          <div className="text-2xl font-black mt-2">{formatRupiah(totalPayable)}</div>
          <div className="text-[11px] text-stone-400 mt-1">{records.length} transaksi hutang</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Sisa Hutang</div>
          <div className="text-2xl font-black mt-2 text-red-600">{formatRupiah(outstandingTotal)}</div>
          <div className="text-[11px] text-stone-400 mt-1">Belum lunas</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-stone-200">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Lunas</div>
          <div className="text-2xl font-black mt-2 text-emerald-700">
            {records.filter((record) => record.status === 'paid').length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Hutang selesai dibayar</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h3 className="font-extrabold text-base">Daftar Hutang Supplier</h3>
            <p className="text-xs text-stone-500 mt-1">Saldo sisa dihitung dari total hutang dikurangi seluruh pembayaran.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-semibold">
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Bayar</option>
            <option value="partial">Sebagian</option>
            <option value="paid">Lunas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-y border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Supplier</th>
                <th className="py-3 px-5">Referensi</th>
                <th className="py-3 px-5">Jatuh Tempo</th>
                <th className="py-3 px-5 text-right">Total</th>
                <th className="py-3 px-5 text-right">Dibayar</th>
                <th className="py-3 px-5 text-right">Sisa</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-stone-50">
                  <td className="py-3 px-5 font-bold text-stone-800">{record.supplierName}</td>
                  <td className="py-3 px-5 text-stone-500">{record.referenceNumber || '—'}</td>
                  <td className="py-3 px-5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-stone-500">
                      <CalendarDays className="w-3.5 h-3.5" /> {record.dueDate || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-semibold">{formatRupiah(record.totalAmount)}</td>
                  <td className="py-3 px-5 text-right text-emerald-700 font-semibold">{formatRupiah(record.paidAmount)}</td>
                  <td className="py-3 px-5 text-right text-red-600 font-black">{formatRupiah(record.outstandingAmount)}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                      record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      record.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {record.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <CircleDollarSign className="w-3 h-3" />}
                      {record.status === 'paid' ? 'Lunas' : record.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    {record.outstandingAmount > 0 && (
                      <button onClick={() => openPayment(record)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[10px] font-bold cursor-pointer">
                        Bayar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredRecords.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-stone-400">Belum ada hutang supplier.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">{form === 'create' ? 'Catat Hutang Supplier' : 'Bayar Hutang Supplier'}</h3>
                <p className="text-[11px] text-emerald-100 mt-1">
                  {form === 'create' ? 'Buat kewajiban pembayaran kepada supplier.' : `Sisa hutang: ${formatRupiah(selectedPayable?.outstandingAmount ?? 0)}`}
                </p>
              </div>
              <button onClick={resetForm} className="text-emerald-100 hover:text-white cursor-pointer">✕</button>
            </div>

            {form === 'create' ? (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">Supplier</label>
                  <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold">
                    <option value="">Pilih supplier</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Total Hutang</label>
                  <input type="number" min={1} step={1} value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} required className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold" placeholder="1500000" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Nomor Referensi</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className="mt-1 w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" placeholder="Invoice supplier" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Jatuh Tempo</label>
                  <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Keterangan</label>
                  <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" placeholder="Pembelian barang dari supplier" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs cursor-pointer">Batal</button>
                  <button type="submit" disabled={saving || suppliers.length === 0} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50">
                    {saving ? 'Menyimpan...' : 'Simpan Hutang'}
                  </button>
                </div>
                {suppliers.length === 0 && <p className="text-[11px] text-red-600 font-semibold">Belum ada supplier. Tambahkan supplier terlebih dahulu.</p>}
              </form>
            ) : (
              <form onSubmit={handlePayment} className="p-6 space-y-4">
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
                  <div className="text-xs font-bold text-stone-500">{selectedPayable?.supplierName}</div>
                  <div className="text-lg font-black text-red-600 mt-1">{formatRupiah(selectedPayable?.outstandingAmount ?? 0)}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Rekening Pembayaran</label>
                  <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} required className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold">
                    <option value="">Pilih rekening</option>
                    {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {formatRupiah(account.balance)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Nominal Pembayaran</label>
                  <input type="number" min={1} step={1} max={selectedPayable?.outstandingAmount ?? undefined} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Catatan</label>
                  <input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs" placeholder="Cicilan ke-1" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs cursor-pointer">Batal</button>
                  <button type="submit" disabled={saving || activeAccounts.length === 0} className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs cursor-pointer disabled:opacity-50">
                    {saving ? 'Membayar...' : 'Simpan Pembayaran'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
