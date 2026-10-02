import React, { useEffect, useState } from 'react';
import { Plus, Wallet, CreditCard, CheckCircle2, Clock3, AlertCircle } from 'lucide-react';
import { CustomerReceivableRecord, FinancialAccount } from '../types';
import {
  apiCreateCustomerReceivable,
  apiGetCustomerReceivableOptions,
  apiGetCustomerReceivables,
  apiGetFinancialAccounts,
  apiRecordCustomerPayment,
} from '../utils/api';
import { formatRupiah } from '../utils/storage';

export const AdminCustomerReceivables: React.FC = () => {
  const [rows, setRows] = useState<CustomerReceivableRecord[]>([]);
  const [customers, setCustomers] = useState<Array<{id:string;name:string}>>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [paying, setPaying] = useState<CustomerReceivableRecord | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [r,c,a] = await Promise.all([apiGetCustomerReceivables(), apiGetCustomerReceivableOptions(), apiGetFinancialAccounts()]);
    setRows(r ?? []); setCustomers(c ?? []); setAccounts((a ?? []).filter(x=>x.isActive));
  };
  useEffect(()=>{ void load(); },[]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const res = await apiCreateCustomerReceivable({customerId,totalAmount:Number(amount),referenceNumber:reference,dueDate:dueDate||null});
    if(!res.success){setError(res.error||'Gagal membuat piutang');return;}
    setShowCreate(false); setAmount(''); setReference(''); setDueDate(''); await load();
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if(!paying) return;
    const value=Number(payAmount);
    if(!accountId || value<=0 || value>paying.outstandingAmount){setError('Nominal pembayaran tidak valid.');return;}
    const res=await apiRecordCustomerPayment({receivableId:paying.id,accountId,amount:value,notes});
    if(!res.success){setError(res.error||'Gagal mencatat pembayaran');return;}
    setPaying(null); setPayAmount(''); setNotes(''); await load();
  };

  const outstanding=rows.reduce((s,r)=>s+r.outstandingAmount,0);
  const paid=rows.reduce((s,r)=>s+r.paidAmount,0);
  const total=rows.reduce((s,r)=>s+r.totalAmount,0);

  return <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-5">
    <div className="bg-white rounded-3xl border border-stone-200 p-5 flex justify-between items-center gap-3">
      <div><h2 className="text-xl font-black">Piutang Pelanggan</h2><p className="text-xs text-stone-500 mt-1">Kelola kredit pelanggan dan pembayaran bertahap.</p></div>
      <button onClick={()=>setShowCreate(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex gap-2 items-center"><Plus className="w-4 h-4"/>Tambah Piutang</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-3xl border p-5"><span className="text-[10px] font-bold text-stone-500 uppercase">Total Piutang</span><div className="text-xl font-black mt-2">{formatRupiah(total)}</div></div>
      <div className="bg-white rounded-3xl border p-5"><span className="text-[10px] font-bold text-stone-500 uppercase">Sudah Dibayar</span><div className="text-xl font-black mt-2 text-emerald-700">{formatRupiah(paid)}</div></div>
      <div className="bg-white rounded-3xl border p-5"><span className="text-[10px] font-bold text-stone-500 uppercase">Outstanding</span><div className="text-xl font-black mt-2 text-amber-700">{formatRupiah(outstanding)}</div></div>
    </div>
    <div className="bg-white rounded-3xl border overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-stone-50 text-stone-500 uppercase text-[10px]"><tr><th className="p-3 text-left">Pelanggan</th><th className="p-3 text-left">Referensi</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Terbayar</th><th className="p-3 text-right">Sisa</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(r=><tr key={r.id}><td className="p-3 font-bold">{r.customerName}</td><td className="p-3">{r.referenceNumber||'-'}{r.dueDate&&<div className="text-[10px] text-stone-400">Jatuh tempo {r.dueDate}</div>}</td><td className="p-3 text-right">{formatRupiah(r.totalAmount)}</td><td className="p-3 text-right">{formatRupiah(r.paidAmount)}</td><td className="p-3 text-right font-black">{formatRupiah(r.outstandingAmount)}</td><td className="p-3 text-center">{r.status==='paid'?<CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto"/>:r.status==='partial'?<Clock3 className="w-4 h-4 text-amber-600 mx-auto"/>:<AlertCircle className="w-4 h-4 text-stone-400 mx-auto"/>}</td><td className="p-3 text-center">{r.status!=='paid'&&<button onClick={()=>setPaying(r)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold">Bayar</button>}</td></tr>)}</tbody></table></div>
    </div>
    {showCreate&&<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form onSubmit={create} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4"><h3 className="font-black">Tambah Piutang</h3><select required value={customerId} onChange={e=>setCustomerId(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm"><option value="">Pilih pelanggan</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Nominal" className="w-full border rounded-xl p-2.5"/><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="No. referensi" className="w-full border rounded-xl p-2.5"/><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full border rounded-xl p-2.5"/>{error&&<p className="text-xs text-red-600">{error}</p>}<div className="flex gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="flex-1 border rounded-xl py-2">Batal</button><button className="flex-1 bg-emerald-600 text-white rounded-xl py-2 font-bold">Simpan</button></div></form></div>}
    {paying&&<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form onSubmit={pay} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4"><h3 className="font-black">Bayar Piutang</h3><p className="text-xs text-stone-500">Sisa: <b>{formatRupiah(paying.outstandingAmount)}</b></p><select required value={accountId} onChange={e=>setAccountId(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm"><option value="">Pilih akun penerimaan</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} — {formatRupiah(a.balance)}</option>)}</select><input required type="number" min="1" max={paying.outstandingAmount} value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Nominal pembayaran" className="w-full border rounded-xl p-2.5"/><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Catatan" className="w-full border rounded-xl p-2.5"/>{error&&<p className="text-xs text-red-600">{error}</p>}<div className="flex gap-2"><button type="button" onClick={()=>setPaying(null)} className="flex-1 border rounded-xl py-2">Batal</button><button className="flex-1 bg-emerald-600 text-white rounded-xl py-2 font-bold flex items-center justify-center gap-2"><Wallet className="w-4 h-4"/>Simpan Pembayaran</button></div></form></div>}
  </div>;
};
