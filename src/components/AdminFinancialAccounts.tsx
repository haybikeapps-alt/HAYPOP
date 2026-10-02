import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Banknote, Building2, CreditCard, Edit3, Plus, Wallet, Power, RefreshCw } from 'lucide-react';
import { FinancialAccount } from '../types';
import { apiCreateFinancialAccount, apiGetFinancialAccounts, apiToggleFinancialAccount, apiTransferFinancialFunds } from '../utils/api';

const typeLabels: Record<FinancialAccount['accountType'], string> = {
  cash: 'Kas',
  bank: 'Bank',
  qris: 'QRIS',
  ewallet: 'E-Wallet',
};

const typeIcons = {
  cash: Banknote,
  bank: Building2,
  qris: CreditCard,
  ewallet: Wallet,
};

const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export const AdminFinancialAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ code: '', name: '', accountType: 'cash' as FinancialAccount['accountType'], paymentMethodCode: '', description: '' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '', description: '' });

  const load = async () => {
    setLoading(true);
    const data = await apiGetFinancialAccounts();
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  const resetForm = () => {
    setForm({ code: '', name: '', accountType: 'cash', paymentMethodCode: '', description: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    setMessage('');
    const ok = await apiCreateFinancialAccount({
      id: editingId ?? undefined,
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      accountType: form.accountType,
      paymentMethodCode: form.paymentMethodCode.trim() || null,
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (!ok) {
      setMessage('Gagal menyimpan rekening. Pastikan kode rekening unik.');
      return;
    }
    resetForm();
    setMessage('Rekening berhasil disimpan.');
    await load();
  };

  const startEdit = (account: FinancialAccount) => {
    setEditingId(account.id);
    setForm({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      paymentMethodCode: account.paymentMethodCode ?? '',
      description: account.description ?? '',
    });
    setShowForm(true);
  };

  const toggle = async (account: FinancialAccount) => {
    const ok = await apiToggleFinancialAccount(account.id, !account.isActive);
    setMessage(ok ? 'Status rekening diperbarui.' : 'Rekening tidak dapat diubah statusnya.');
    if (ok) await load();
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transfer.amount);
    if (!transfer.from || !transfer.to || transfer.from === transfer.to || amount <= 0) return;
    setSaving(true);
    setMessage('');
    const result = await apiTransferFinancialFunds(transfer.from, transfer.to, amount, transfer.description.trim() || null);
    setSaving(false);
    if (!result.success) {
      setMessage(result.error || 'Transfer gagal.');
      return;
    }
    setTransfer({ from: '', to: '', amount: '', description: '' });
    setShowTransfer(false);
    setMessage('Transfer berhasil dicatat.');
    await load();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900">Rekening & Saldo</h2>
          <p className="text-xs text-stone-500 mt-1">Kelola Kas, Bank, QRIS, dan E-Wallet secara terpisah.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowTransfer(true)} disabled={activeAccounts.length < 2} className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 font-bold text-xs flex items-center gap-2 disabled:opacity-40">
            <ArrowRightLeft className="w-4 h-4" /> Transfer
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Rekening
          </button>
          <button onClick={() => void load()} className="p-2.5 rounded-xl border border-stone-200 text-stone-500" title="Muat ulang">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 text-xs font-semibold">{message}</div>}

      <div className="bg-stone-900 text-white rounded-3xl p-5">
        <div className="text-xs text-stone-300 font-semibold">Total saldo seluruh rekening aktif</div>
        <div className="text-3xl font-black mt-1">{rupiah(activeAccounts.reduce((sum, a) => sum + a.balance, 0))}</div>
        <div className="text-[11px] text-stone-400 mt-1">{activeAccounts.length} rekening aktif</div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-10 text-center text-sm text-stone-500">Memuat rekening...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-stone-300">
          <Wallet className="w-10 h-10 mx-auto text-stone-300" />
          <p className="font-bold text-stone-700 mt-3">Belum ada rekening</p>
          <p className="text-xs text-stone-500 mt-1">Tambahkan rekening pembayaran. Saldo awal selalu Rp0 sesuai desain sistem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = typeIcons[account.accountType];
            return (
              <div key={account.id} className={'bg-white rounded-3xl p-5 border ' + (account.isActive ? 'border-stone-200' : 'border-stone-100 opacity-60') + ' shadow-xs'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                    <div>
                      <div className="font-black text-stone-900">{account.name}</div>
                      <div className="text-[11px] text-stone-500">{typeLabels[account.accountType]} · {account.code}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(account)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => void toggle(account)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500" title={account.isActive ? 'Nonaktifkan' : 'Aktifkan'}><Power className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-5 text-2xl font-black text-stone-900">{rupiah(account.balance)}</div>
                {account.paymentMethodCode && <div className="mt-2 text-[11px] text-stone-500">POS: {account.paymentMethodCode}</div>}
                {account.description && <div className="mt-2 text-xs text-stone-500">{account.description}</div>}
                <div className={'mt-4 text-[10px] font-bold uppercase tracking-wider ' + (account.isActive ? 'text-emerald-700' : 'text-stone-400')}>{account.isActive ? 'Aktif' : 'Nonaktif'}</div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={submitAccount} className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center"><h3 className="font-black text-lg">{editingId ? 'Edit Rekening' : 'Tambah Rekening'}</h3><button type="button" onClick={resetForm} className="text-stone-400">✕</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold text-stone-700">Kode<input required value={form.code} onChange={(e) => setForm({...form, code:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" placeholder="cash" disabled={Boolean(editingId)} /></label>
              <label className="text-xs font-bold text-stone-700">Nama<input required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" placeholder="Kas Utama" /></label>
              <label className="text-xs font-bold text-stone-700">Jenis<select value={form.accountType} onChange={(e) => setForm({...form, accountType:e.target.value as FinancialAccount['accountType']})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"><option value="cash">Kas</option><option value="bank">Bank</option><option value="qris">QRIS</option><option value="ewallet">E-Wallet</option></select></label>
              <label className="text-xs font-bold text-stone-700">Kode POS (opsional)<input value={form.paymentMethodCode} onChange={(e) => setForm({...form, paymentMethodCode:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" placeholder="cash / qris / gopay" /></label>
            </div>
            <label className="text-xs font-bold text-stone-700">Keterangan<textarea value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" rows={3} /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Batal</button><button disabled={saving} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
          </form>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={submitTransfer} className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center"><h3 className="font-black text-lg">Transfer Antar Rekening</h3><button type="button" onClick={() => setShowTransfer(false)} className="text-stone-400">✕</button></div>
            <label className="text-xs font-bold text-stone-700">Dari<select required value={transfer.from} onChange={(e) => setTransfer({...transfer, from:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"><option value="">Pilih rekening</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {rupiah(a.balance)}</option>)}</select></label>
            <label className="text-xs font-bold text-stone-700">Ke<select required value={transfer.to} onChange={(e) => setTransfer({...transfer, to:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"><option value="">Pilih rekening</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="text-xs font-bold text-stone-700">Nominal<input required type="number" min="1" step="1" value={transfer.amount} onChange={(e) => setTransfer({...transfer, amount:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" /></label>
            <label className="text-xs font-bold text-stone-700">Keterangan<input value={transfer.description} onChange={(e) => setTransfer({...transfer, description:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" placeholder="Setor kas ke bank" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowTransfer(false)} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Batal</button><button disabled={saving} className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold">{saving ? 'Memproses...' : 'Transfer'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
