import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, LogIn } from 'lucide-react';
import { User } from '../types';
import { apiLogin } from '../utils/api';

interface RoleSwitchModalProps {
  currentUser?: User | null;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ currentUser, onSelectUser, onClose }) => {
  const [username, setUsername] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !/^\d{4,6}$/.test(pinInput)) {
      setErrorMsg('Masukkan username dan PIN 4-6 digit.');
      return;
    }

    setIsSubmitting(true);
    const user = await apiLogin(username.trim(), pinInput);
    setIsSubmitting(false);

    if (!user) {
      setErrorMsg('Login gagal. Username/PIN salah atau akun tidak aktif.');
      return;
    }

    onSelectUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/60 text-emerald-200 flex items-center justify-center">
              {currentUser ? <ShieldCheck className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{currentUser ? 'Ganti Pengguna' : 'Masuk ke HAYPOP'}</h3>
              <p className="text-xs text-emerald-200">
                {currentUser ? 'Login ulang untuk mengganti akun & hak akses' : 'Autentikasi server diperlukan untuk melanjutkan'}
              </p>
            </div>
          </div>
          {currentUser && (
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
            Hak akses ditentukan oleh server setelah username dan PIN diverifikasi. Data PIN tidak disimpan di browser.
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Username</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="contoh: kasir1"
              maxLength={50}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="4-6 digit"
              required
              className="w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-3 rounded-xl border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {currentUser && (
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 font-semibold text-stone-600 hover:bg-stone-50 text-sm">
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-bold text-white text-sm shadow-sm"
            >
              {isSubmitting ? 'Memverifikasi...' : currentUser ? 'Ganti Akun' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
