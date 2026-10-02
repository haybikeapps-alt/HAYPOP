import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck, UserCheck, Trash2, Edit2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { apiDeleteUser, apiGetUsers, apiSaveUser } from '../utils/api';

export const AdminUserManagement: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await apiGetUsers();
    if (data) setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setRole(u.role);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.id === currentUser.id && role !== currentUser.role) {
      alert('Perubahan role akun sendiri diblokir demi mencegah kehilangan akses.');
      return;
    }

    const updated: User = {
      ...editingUser,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role,
    };

    if (!updated.name || !updated.username) {
      alert('Nama dan username wajib diisi.');
      return;
    }

    const ok = await apiSaveUser(updated);
    if (!ok) {
      alert('Perubahan gagal disimpan. Periksa hak akses dan data pengguna.');
      return;
    }

    setEditingUser(null);
    await loadUsers();
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('Tidak dapat menonaktifkan akun yang sedang digunakan.');
      return;
    }

    const ok = await apiSaveUser({ ...user, isActive: !user.isActive });
    if (!ok) {
      alert('Status pengguna gagal diubah. Database mungkin melindungi admin terakhir.');
      return;
    }
    await loadUsers();
  };

  const handleDeactivate = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('Tidak dapat menonaktifkan akun sendiri.');
      return;
    }
    if (!confirm(`Nonaktifkan akun ${user.name}? Akun Auth tetap ada, tetapi tidak dapat masuk ke HAYPOP.`)) return;

    const ok = await apiDeleteUser(user.id);
    if (!ok) {
      alert('Pengguna gagal dinonaktifkan.');
      return;
    }
    await loadUsers();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">Manajemen Pengguna & Kasir</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Data dibaca langsung dari Supabase. Password/PIN tidak dikelola atau disimpan oleh HAYPOP.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Pembuatan akun Auth baru harus dilakukan melalui Supabase Auth/Edge Function yang aman.
          HAYPOP tidak lagi membuat akun palsu di LocalStorage.
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-emerald-50/70 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Nama</th>
              <th className="py-3.5 px-4">Username</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-medium">
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-stone-500">Memuat pengguna...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-stone-500">Belum ada profil pengguna.</td></tr>
            ) : users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <tr key={u.id} className="hover:bg-emerald-50/40 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${u.avatarColor || (u.role === 'admin' ? 'bg-emerald-700' : 'bg-teal-600')}`}>
                        {u.name?.[0] || '?'}
                      </div>
                      <span className="font-extrabold text-stone-900">{u.name}</span>
                      {isSelf && <span className="text-[10px] text-emerald-700 font-bold">(Anda)</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">{u.username}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        <UserCheck className="w-3 h-3" /> Kasir
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => void handleToggleActive(u)}
                      disabled={isSelf}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border disabled:opacity-50 ${u.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}
                    >
                      {u.isActive ? 'Aktif' : 'Non-aktif'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-stone-600"
                        title="Edit profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => void handleDeactivate(u)}
                          className="p-1.5 rounded-xl border border-stone-200 hover:border-red-300 hover:bg-red-50 text-stone-400 hover:text-red-600"
                          title="Nonaktifkan akun"
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

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-extrabold text-base">Edit Profil Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-emerald-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Nama Lengkap</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Username</label>
                <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} disabled={editingUser.id === currentUser.id} className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300">
                  <option value="kasir">Kasir</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold">Batal</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
