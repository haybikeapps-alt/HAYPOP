import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarRange, Download, RefreshCw, Wallet, TrendingUp, TrendingDown, CreditCard, Truck, Users } from 'lucide-react';
import { FinancialAccount, SupplierPayableRecord, CustomerReceivableRecord } from '../types';
import { apiGetCustomerReceivables, apiGetFinancialAccounts, apiGetFinancialEntries, apiGetSupplierPayables } from '../utils/api';
import { formatRupiah } from '../utils/storage';

export const AdminFinanceDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [payables, setPayables] = useState<SupplierPayableRecord[]>([]);
  const [receivables, setReceivables] = useState<CustomerReceivableRecord[]>([]);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof apiGetFinancialEntries>>>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    let start = new Date(now);
    if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week') start = new Date(now.getTime() - 6 * 86400000);
    if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'year') start = new Date(now.getFullYear(), 0, 1);
    if (period === 'custom') start = new Date(from + 'T00:00:00');
    const end = period === 'custom' ? new Date(to + 'T23:59:59.999') : now;
    const [a, p, r, e] = await Promise.all([
      apiGetFinancialAccounts(),
      apiGetSupplierPayables(),
      apiGetCustomerReceivables(),
      apiGetFinancialEntries({ from: start.toISOString(), to: new Date(end.getTime() + 1).toISOString() }),
    ]);
    setAccounts(a ?? []);
    setPayables(p ?? []);
    setReceivables(r ?? []);
    setEntries(e ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [period, from, to]);

  const totals = useMemo(() => {
    const incoming = (entries ?? []).filter(e => e.direction === 'in').reduce((s,e) => s + e.amount, 0);
    const outgoing = (entries ?? []).filter(e => e.direction === 'out').reduce((s,e) => s + e.amount, 0);
    const sales = (entries ?? []).filter(e => e.entryType === 'sale').reduce((s,e) => s + e.amount, 0);
    const expenses = (entries ?? []).filter(e => e.direction === 'out' && e.entryType === 'expense').reduce((s,e) => s + e.amount, 0);
    return { incoming, outgoing, sales, expenses, net: incoming - outgoing };
  }, [entries]);

  const totalBalance = accounts.reduce((s,a) => s + a.balance, 0);
  const outstandingPayables = payables.filter(p => p.status !== 'paid').reduce((s,p) => s + p.outstandingAmount, 0);
  const outstandingReceivables = receivables.filter(r => r.status !== 'paid').reduce((s,r) => s + r.outstandingAmount, 0);

  const exportCsv = () => {
    const rows = [['Tanggal','Jenis','Arah','Nominal','Keterangan'], ...(entries ?? []).map(e => [
      e.entryDate, e.entryType, e.direction, String(e.amount), e.description ?? ''
    ])];
    const csv = rows.map(row => row.map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'haypop-laporan-keuangan.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-5">
    <div className="bg-white rounded-3xl border border-stone-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><h2 className="text-xl font-black">Dashboard Keuangan HAYPOP</h2><p className="text-xs text-stone-500 mt-1">Saldo, arus kas, penjualan, pengeluaran, hutang dan piutang.</p></div>
      <div className="flex flex-wrap gap-2">
        {(['today','week','month','year','custom'] as const).map(x => <button key={x} onClick={() => setPeriod(x)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${period===x?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-white text-stone-600 border-stone-200'}`}>{x==='today'?'Hari':x==='week'?'Minggu':x==='month'?'Bulan':x==='year'?'Tahun':'Custom'}</button>)}
        <button onClick={() => void load()} className="p-2 rounded-xl border border-stone-200"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button>
        <button onClick={exportCsv} className="p-2 rounded-xl border border-stone-200"><Download className="w-4 h-4" /></button>
      </div>
    </div>
    {period==='custom' && <div className="bg-white rounded-2xl border border-stone-200 p-4 flex gap-3 items-center"><CalendarRange className="w-4 h-4 text-stone-400"/><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded-xl px-3 py-2 text-xs"/><span className="text-xs">s/d</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded-xl px-3 py-2 text-xs"/></div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        ['Saldo Semua Akun', totalBalance, Wallet],
        ['Pemasukan', totals.incoming, TrendingUp],
        ['Pengeluaran', totals.outgoing, TrendingDown],
        ['Arus Kas Bersih', totals.net, CreditCard],
      ].map(([label,value,Icon]) => <div key={String(label)} className="bg-white rounded-3xl border border-stone-200 p-5"><div className="flex justify-between"><span className="text-[11px] font-bold text-stone-500 uppercase">{String(label)}</span><Icon className="w-4 h-4 text-emerald-600"/></div><div className="text-xl font-black mt-2">{formatRupiah(Number(value))}</div></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-3xl border p-5"><div className="flex items-center gap-2 text-xs font-bold"><TrendingUp className="w-4 h-4"/>Penjualan</div><div className="text-lg font-black mt-2">{formatRupiah(totals.sales)}</div></div>
      <div className="bg-white rounded-3xl border p-5"><div className="flex items-center gap-2 text-xs font-bold"><TrendingDown className="w-4 h-4"/>Biaya</div><div className="text-lg font-black mt-2">{formatRupiah(totals.expenses)}</div></div>
      <div className="bg-white rounded-3xl border p-5"><div className="flex items-center gap-2 text-xs font-bold"><Truck className="w-4 h-4"/>Hutang Supplier</div><div className="text-lg font-black mt-2">{formatRupiah(outstandingPayables)}</div></div>
      <div className="bg-white rounded-3xl border p-5"><div className="flex items-center gap-2 text-xs font-bold"><Users className="w-4 h-4"/>Piutang Pelanggan</div><div className="text-lg font-black mt-2">{formatRupiah(outstandingReceivables)}</div></div>
    </div>
    <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
      <div className="p-4 border-b font-bold text-sm">Saldo Akun</div>
      <div className="divide-y">{accounts.map(a=><div key={a.id} className="p-4 flex justify-between items-center"><div><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] text-stone-400">{a.code} · {a.accountType}</div></div><div className="font-black">{formatRupiah(a.balance)}</div></div>)}</div>
    </div>
  </div>;
};
