import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Building,
  Smartphone,
  Save,
  CheckCircle,
  Upload,
  Trash2,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import { PaymentAccountSettings } from '../types';
import { getPaymentAccountSettings, savePaymentAccountSettings } from '../utils/storage';

interface AdminPaymentSettingsProps {
  onSettingsSaved?: () => void;
}

export const AdminPaymentSettings: React.FC<AdminPaymentSettingsProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<PaymentAccountSettings>(() => getPaymentAccountSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // QRIS custom image upload
  const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar valid (PNG/JPG/SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        qris: {
          ...prev.qris,
          qrImageDataUrl: dataUrl,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrisImage = () => {
    setSettings((prev) => ({
      ...prev,
      qris: {
        ...prev.qris,
        qrImageDataUrl: undefined,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePaymentAccountSettings(settings);
    if (onSettingsSaved) onSettingsSaved();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Pengaturan Akun Pembayaran (QRIS, Bank & E-Wallet)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Konfigurasi pusat akun penerima pembayaran. Kasir di POS tidak perlu lagi mengisi nomor/rekening secara manual!
              </p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs">
            <CheckCircle className="w-4 h-4" />
            Pengaturan Pembayaran Tersimpan!
          </span>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Semua nomor rekening dan akun yang dikonfigurasi di halaman ini akan <strong>otomatis terhubung ke antarmuka kasir POS</strong>. Saat pelanggan memilih metode pembayaran, data barcode QRIS, nomor rekening, dan akun e-wallet langsung ditampilkan dalam 1 detik untuk mempercepat antrean transaksi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. QRIS CONFIGURATION */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-stone-900">1. Konfigurasi Akun QRIS Toko</h3>
                <p className="text-[11px] text-stone-400">Standar QRIS Nasional (BCA, GoPay, OVO, DANA, ShopeePay)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Otomatis di Kasir
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Nama Merchant QRIS (Tampil ke Pelanggan)
              </label>
              <input
                type="text"
                required
                value={settings.qris.merchantName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qris: { ...settings.qris, merchantName: e.target.value },
                  })
                }
                placeholder="Contoh: HAYPOP OFFICIAL DRINKS & SNACKS"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">
                NMID QRIS (National Merchant ID)
              </label>
              <input
                type="text"
                required
                value={settings.qris.nmid}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qris: { ...settings.qris, nmid: e.target.value },
                  })
                }
                placeholder="Contoh: ID1020268899201"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
              />
            </div>
          </div>

          {/* QRIS Image Upload or Built-in Generator */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-white border border-stone-300 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-inner">
              {settings.qris.qrImageDataUrl ? (
                <img
                  src={settings.qris.qrImageDataUrl}
                  alt="QRIS Merchant"
                  className="max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <QrCode className="w-8 h-8 text-stone-400 mx-auto" />
                  <span className="text-[9px] text-stone-400 font-bold block mt-1">QR Standar</span>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 text-center sm:text-left">
              <label className="inline-block bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-300 shadow-xs cursor-pointer transition">
                <span>Unggah Gambar Stiker QRIS Merchant Asli</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrisImageUpload}
                  className="hidden"
                />
              </label>
              {settings.qris.qrImageDataUrl && (
                <button
                  type="button"
                  onClick={handleRemoveQrisImage}
                  className="block text-red-600 hover:text-red-700 text-xs font-semibold cursor-pointer"
                >
                  Gunakan QR Dinamis Bawaan
                </button>
              )}
              <p className="text-[11px] text-stone-500">
                Bila tidak diunggah, aplikasi akan menampilkan kartu QRIS interaktif dinamis berstandar QRIS nasional.
              </p>
            </div>
          </div>
        </div>

        {/* 2. BANK TRANSFER CONFIGURATION */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-stone-900">2. Konfigurasi Transfer Bank Toko</h3>
                <p className="text-[11px] text-stone-400">Rekening resmi penerima transfer pelanggan</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.transfer.isActive}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    transfer: { ...settings.transfer, isActive: e.target.checked },
                  })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Aktifkan Transfer</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Nama Bank</label>
              <select
                value={settings.transfer.bankName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    transfer: { ...settings.transfer, bankName: e.target.value },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold focus:border-emerald-500 outline-hidden"
              >
                <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                <option value="Bank Mandiri">Bank Mandiri</option>
                <option value="Bank BRI">Bank BRI</option>
                <option value="Bank BNI">Bank BNI</option>
                <option value="Bank BSI (Syariah)">Bank BSI (Syariah)</option>
                <option value="CIMB Niaga">CIMB Niaga</option>
                <option value="Permata Bank">Permata Bank</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Nomor Rekening</label>
              <input
                type="text"
                required
                value={settings.transfer.accountNumber}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    transfer: { ...settings.transfer, accountNumber: e.target.value },
                  })
                }
                placeholder="Contoh: 8830192844"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Atas Nama Rekening</label>
              <input
                type="text"
                required
                value={settings.transfer.accountHolder}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    transfer: { ...settings.transfer, accountHolder: e.target.value },
                  })
                }
                placeholder="Contoh: PT HAYPOP KULINER INDONESIA"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 3. E-WALLETS CONFIGURATION */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-5">
          <div className="pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-stone-900">
                  3. Konfigurasi Nomor Akun E-Wallet Toko
                </h3>
                <p className="text-[11px] text-stone-400">
                  Nomor HP dan nama akun terdaftar untuk GoPay, OVO, DANA, dan ShopeePay
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GoPay */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    G
                  </div>
                  <span className="font-extrabold text-xs text-stone-900">GoPay Toko</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ewallets.gopay.isActive}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ewallets: {
                          ...settings.ewallets,
                          gopay: { ...settings.ewallets.gopay, isActive: e.target.checked },
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nomor HP GoPay</label>
                <input
                  type="text"
                  value={settings.ewallets.gopay.number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        gopay: { ...settings.ewallets.gopay, number: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nama Akun GoPay</label>
                <input
                  type="text"
                  value={settings.ewallets.gopay.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        gopay: { ...settings.ewallets.gopay, name: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* OVO */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-700 text-white font-black text-xs flex items-center justify-center">
                    O
                  </div>
                  <span className="font-extrabold text-xs text-stone-900">OVO Toko</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ewallets.ovo.isActive}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ewallets: {
                          ...settings.ewallets,
                          ovo: { ...settings.ewallets.ovo, isActive: e.target.checked },
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nomor HP OVO</label>
                <input
                  type="text"
                  value={settings.ewallets.ovo.number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        ovo: { ...settings.ewallets.ovo, number: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nama Akun OVO</label>
                <input
                  type="text"
                  value={settings.ewallets.ovo.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        ovo: { ...settings.ewallets.ovo, name: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* DANA */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500 text-white font-black text-xs flex items-center justify-center">
                    D
                  </div>
                  <span className="font-extrabold text-xs text-stone-900">DANA Toko</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ewallets.dana.isActive}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ewallets: {
                          ...settings.ewallets,
                          dana: { ...settings.ewallets.dana, isActive: e.target.checked },
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nomor HP DANA</label>
                <input
                  type="text"
                  value={settings.ewallets.dana.number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        dana: { ...settings.ewallets.dana, number: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nama Akun DANA</label>
                <input
                  type="text"
                  value={settings.ewallets.dana.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        dana: { ...settings.ewallets.dana, name: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* ShopeePay */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                    S
                  </div>
                  <span className="font-extrabold text-xs text-stone-900">ShopeePay Toko</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.ewallets.shopeepay.isActive}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ewallets: {
                          ...settings.ewallets,
                          shopeepay: { ...settings.ewallets.shopeepay, isActive: e.target.checked },
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nomor HP ShopeePay</label>
                <input
                  type="text"
                  value={settings.ewallets.shopeepay.number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        shopeepay: { ...settings.ewallets.shopeepay, number: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Nama Akun ShopeePay</label>
                <input
                  type="text"
                  value={settings.ewallets.shopeepay.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ewallets: {
                        ...settings.ewallets,
                        shopeepay: { ...settings.ewallets.shopeepay, name: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 px-6 rounded-2xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Seluruh Pengaturan Akun Pembayaran</span>
        </button>
      </form>
    </div>
  );
};
