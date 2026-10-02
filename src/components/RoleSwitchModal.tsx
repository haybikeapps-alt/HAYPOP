import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, X, Check, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { getStoredUsers } from '../utils/storage';

interface RoleSwitchModalProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ currentUser, onSelectUser, onClose }) => {
  const users = getStoredUsers();
  const [selectedTarget, setSelectedTarget] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickUser = (u: User) => {
    setSelectedTarget(u);
    setPinInput('');
    setErrorMsg('');
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    if (pinInput.trim() !== selectedTarget.pin) {
      setErrorMsg(`PIN salah untuk ${selectedTarget.name}. (Petunjuk: PIN default adalah "${selectedTarget.pin}")`);
      return;
    }

    onSelectUser(selectedTarget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/60 text-emerald-200 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Ganti Pengguna & Hak Akses</h3>
              <p className="text-xs text-emerald-200">Pilih akun Kasir atau Administrator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Pilih Pengguna Bertugas
            </label>
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = selectedTarget?.id === user.id || (!selectedTarget && currentUser.id === user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handlePickUser(user)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 text-stone-900 ring-2 ring-emerald-400/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          user.avatarColor || (user.role === 'admin' ? 'bg-emerald-700' : 'bg-teal-600')
                        }`}
                      >
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 flex items-center gap-2">
                          {user.name}
                          {user.role === 'admin' ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Admin (Full Akses)
                            </span>
                          ) : (
                            <span className="bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Kasir (POS & Riwayat)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">
                          {user.role === 'admin'
                            ? 'Akses stok, laporan keuangan & BEP, pembayaran'
                            : 'Hanya transaksi penjualan kasir & struk'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input */}
          <form onSubmit={handleConfirmSwitch} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  Masukkan PIN Keamanan
                </label>
                <span className="text-[11px] text-stone-600 font-medium">
                  {selectedTarget?.role === 'admin' ? 'Default PIN Admin: 1234' : 'Default PIN Kasir: 0000 / 1111'}
                </span>
              </div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan 4-6 digit PIN..."
                autoFocus
                className="w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-3 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 font-semibold text-stone-600 hover:bg-stone-50 text-sm transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-sm transition cursor-pointer shadow-sm hover:shadow"
              >
                Konfirmasi Masuk
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
