import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, UserCheck, Trash2, Edit2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { getStoredUsers, saveStoredUsers } from '../utils/storage';

export const AdminUserManagement: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPin('');
    setRole('kasir');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPin(u.pin);
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    if (id === currentUser.id) {
      alert('Tidak dapat menonaktifkan akun yang sedang digunakan saat ini.');
      return;
    }
    const updated = users.map((u) => {
      if (u.id === id) {
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });
    setUsers(updated);
    saveStoredUsers(updated);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (confirm('Yakin ingin menghapus pengguna ini?')) {
      const updated = users.filter((u) => u.id !== id);
      setUsers(updated);
      saveStoredUsers(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      alert('PIN harus terdiri dari minimal 4 angka.');
      return;
    }

    if (editingUser) {
      const updated = users.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name,
            username: username.toLowerCase().trim(),
            pin,
            role,
          };
        }
        return u;
      });
      setUsers(updated);
      saveStoredUsers(updated);
    } else {
      const colors = ['bg-emerald-600', 'bg-teal-600', 'bg-green-600', 'bg-emerald-700', 'bg-teal-700'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        id: 'usr-' + Date.now(),
        name,
        username: username.toLowerCase().trim() || 'kasir_' + Date.now().toString().slice(-4),
        pin,
        role,
        avatarColor: randomColor,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...users, newUser];
      setUsers(updated);
      saveStoredUsers(updated);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Manajemen Pengguna & Kasir
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Atur staf kasir, batasan hak akses (Admin vs Kasir), dan kode PIN login transaksi.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-emerald-50/70 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Nama Lengkap</th>
              <th className="py-3.5 px-4">Username</th>
              <th className="py-3.5 px-4">Hak Akses (Role)</th>
              <th className="py-3.5 px-4">Kode PIN</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-medium">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <tr key={u.id} className="hover:bg-emerald-50/40 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                          u.avatarColor || (u.role === 'admin' ? 'bg-emerald-700' : 'bg-teal-600')
                        }`}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <span className="font-extrabold text-stone-900">{u.name}</span>
                        {isSelf && (
                          <span className="ml-2 text-[10px] text-emerald-700 font-bold">(Anda)</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-stone-600">{u.username}</td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Admin (Akses Penuh)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        <UserCheck className="w-3 h-3 text-teal-600" /> Kasir (POS Saja)
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-stone-700 tracking-wider">
                    •••• ({u.pin})
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(u.id)}
                      disabled={isSelf}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer disabled:opacity-50 ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {u.isActive ? 'Aktif' : 'Non-aktif'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 transition cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-xl border border-stone-200 hover:border-red-300 hover:bg-red-50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Pratama (Kasir 3)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Username Login</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: kasir3"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">
                  Kode PIN Transaksi (4 - 6 Angka)
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Contoh: 1234"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono tracking-widest text-center text-sm font-bold focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Hak Akses Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold text-stone-800 focus:border-emerald-500 outline-hidden"
                >
                  <option value="kasir">Kasir (Hanya Penjualan & Riwayat Kasir)</option>
                  <option value="admin">Administrator (Akses Penuh: Stok, BEP, User)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
