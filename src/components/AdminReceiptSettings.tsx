import React, { useState } from 'react';
import {
  Printer,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bluetooth,
  Save,
  CheckCircle,
  Sliders,
} from 'lucide-react';
import { StoreSettings, Transaction } from '../types';
import { saveStoreSettings, formatRupiah } from '../utils/storage';
import {
  connectBluetoothPrinter,
  isPrinterConnected,
  printDirectThermal,
} from '../utils/escpos';

interface AdminReceiptSettingsProps {
  settings: StoreSettings;
  onSettingsSaved: (newSettings: StoreSettings) => void;
}

export const AdminReceiptSettings: React.FC<AdminReceiptSettingsProps> = ({
  settings,
  onSettingsSaved,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [btStatus, setBtStatus] = useState<string>(
    isPrinterConnected() ? 'Terhubung' : 'Belum Terhubung'
  );
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  // File logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah file format gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        showLogoOnReceipt: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoDataUrl: undefined,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoreSettings(formData);
    onSettingsSaved(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConnectBt = async () => {
    setBtStatus('Sedang mencari perangkat bluetooth...');
    const res = await connectBluetoothPrinter();
    if (res.success) {
      setBtStatus(`Terhubung (${res.deviceName})`);
    } else {
      setBtStatus('Belum Terhubung');
      alert(res.error || 'Gagal menyambungkan Bluetooth.');
    }
  };

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    const dummyTrx: Transaction = {
      id: 'test-print',
      invoiceNumber: 'TEST/PRINT/001',
      cashierId: 'test',
      cashierName: 'Admin POS',
      timestamp: new Date().toISOString(),
      items: [
        {
          productId: 'demo',
          productName: 'Signature Brown Sugar Boba Fresh Milk',
          quantity: 1,
          unitPrice: 24000,
          totalPrice: 24000,
          modifiersSummary: ['Large Cup (22 oz)', 'Less Sweet 70%', 'Extra Boba Pearl'],
        },
      ],
      subtotal: 24000,
      discount: 0,
      tax: 0,
      totalAmount: 24000,
      paymentMethod: 'cash',
      amountPaid: 50000,
      change: 26000,
    };

    if (isPrinterConnected()) {
      const res = await printDirectThermal(dummyTrx, formData);
      if (!res.success) {
        alert(res.error || 'Gagal cetak test bluetooth.');
      } else {
        alert('Cetak uji coba berhasil dikirim ke printer bluetooth!');
      }
    } else {
      window.print();
    }
    setIsTestingPrint(false);
  };

  const logoAlignClass =
    formData.logoAlignment === 'left'
      ? 'text-left'
      : formData.logoAlignment === 'right'
      ? 'text-right'
      : 'text-center';

  const logoImgAlignClass =
    formData.logoAlignment === 'left'
      ? 'mr-auto'
      : formData.logoAlignment === 'right'
      ? 'ml-auto'
      : 'mx-auto';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Pengaturan Logo & Struk Thermal
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Kustomisasi logo toko, tata letak struk, lebar kertas 58mm/80mm, dan konfigurasi Bluetooth printer langsung.
              </p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs">
            <CheckCircle className="w-4 h-4" />
            Pengaturan Berhasil Disimpan!
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Settings Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* 1. LOGO UPLOAD & ALIGNMENT SECTION */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900">1. Upload Logo Toko & Tata Letak di Struk</h3>
                  <p className="text-[11px] text-stone-400">Atur penempatan logo pada kertas struk thermal</p>
                </div>
              </div>
            </div>

            {/* Logo Preview & Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-emerald-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0">
                {formData.logoDataUrl ? (
                  <img
                    src={formData.logoDataUrl}
                    alt="Logo Toko"
                    className="max-h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-stone-400 font-bold text-center">
                    Belum Ada Logo
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <label className="inline-block bg-white hover:bg-emerald-50 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-300 shadow-xs cursor-pointer transition">
                  <span>Pilih File Logo (PNG / JPG / SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {formData.logoDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="block text-red-600 hover:text-red-700 text-xs font-semibold cursor-pointer"
                  >
                    Hapus Logo
                  </button>
                )}
                <p className="text-[11px] text-stone-500">
                  Rekomendasi logo hitam-putih atau transparan berukuran 200x200px untuk hasil cetak thermal tajam.
                </p>
              </div>
            </div>

            {/* Alignment Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Tata Letak Logo di Kertas Struk
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoAlignment: 'left' })}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    formData.logoAlignment === 'left'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-300'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <AlignLeft className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs">Rata Kiri</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoAlignment: 'center' })}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    formData.logoAlignment === 'center'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-300'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <AlignCenter className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs">Rata Tengah</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoAlignment: 'right' })}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    formData.logoAlignment === 'right'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-300'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <AlignRight className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs">Rata Kanan</span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formData.showLogoOnReceipt}
                onChange={(e) => setFormData({ ...formData, showLogoOnReceipt: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-400"
              />
              <span>Tampilkan Logo pada Struk Thermal</span>
            </label>
          </div>

          {/* 2. PAPER WIDTH & STORE IDENTITY */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Ukuran Kertas & Informasi Toko
            </h3>

            {/* Paper width */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Ukuran Lebar Kertas Thermal
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperWidth: '58mm' })}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 transition cursor-pointer font-bold text-xs ${
                    formData.paperWidth === '58mm'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>58 mm (Mini Portable)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperWidth: '80mm' })}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 transition cursor-pointer font-bold text-xs ${
                    formData.paperWidth === '80mm'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>80 mm (POS Kasir Standar)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Nama Toko</label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Slogan / Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Alamat Toko</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">No. WhatsApp / Telp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Pesan Penutup Struk (Footer)</label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">Akun Sosial Media</label>
              <input
                type="text"
                value={formData.receiptSocial}
                onChange={(e) => setFormData({ ...formData, receiptSocial: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* 3. BLUETOOTH THERMAL PRINTER SETUP */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-emerald-600" />
                Koneksi Bluetooth Thermal Printer Langsung
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Web Bluetooth ESC/POS
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900">
                  Status: <span className="text-emerald-700 font-extrabold">{btStatus}</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Hubungkan ke printer thermal bluetooth mini tanpa perlu instal driver tambahan.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConnectBt}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Sambungkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTestingPrint}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Uji Cetak</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-4 rounded-2xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan Struk</span>
          </button>
        </form>

        {/* RIGHT COLUMN: Live Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
              Live Preview Struk ({formData.paperWidth})
            </span>
            <span className="text-[10px] text-stone-400">Simulator Tampilan Kertas</span>
          </div>

          {/* Simulated Thermal Ticket */}
          <div className="bg-stone-200 p-4 rounded-3xl flex justify-center shadow-inner">
            <div
              className={`bg-white text-stone-900 font-mono text-[11px] leading-tight p-5 rounded-lg border border-stone-300 shadow-md ${
                formData.paperWidth === '58mm' ? 'w-[290px]' : 'w-[360px]'
              }`}
            >
              {/* Logo */}
              {formData.showLogoOnReceipt && (
                <div className={`mb-3 ${logoAlignClass}`}>
                  {formData.logoDataUrl ? (
                    <img
                      src={formData.logoDataUrl}
                      alt="Logo Toko"
                      className={`max-h-12 object-contain ${logoImgAlignClass}`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black text-xs ${logoImgAlignClass}`}
                    >
                      HP
                    </div>
                  )}
                </div>
              )}

              {/* Store Header */}
              <div className="text-center space-y-0.5 pb-2">
                <h2 className="font-extrabold text-sm tracking-wider text-stone-900 uppercase">
                  {formData.storeName || 'HAYPOP'}
                </h2>
                {formData.tagline && (
                  <p className="text-[10px] text-stone-600">{formData.tagline}</p>
                )}
                {formData.address && (
                  <p className="text-[10px] text-stone-500">{formData.address}</p>
                )}
                {formData.phone && (
                  <p className="text-[10px] text-stone-500">Telp: {formData.phone}</p>
                )}
              </div>

              <div className="border-b-2 border-dashed border-stone-400 my-2" />

              {/* Mock items */}
              <div className="space-y-1.5 py-1 text-[10px]">
                <div className="flex justify-between">
                  <span>1x Brown Sugar Boba (L)</span>
                  <span className="font-bold">{formatRupiah(28000)}</span>
                </div>
                <div className="text-[9px] text-stone-500 pl-2">
                  - Large Cup (+Rp 4.000)
                  <br />- Less Sweet 70%
                </div>

                <div className="flex justify-between">
                  <span>1x Popcorn Chicken BBQ</span>
                  <span className="font-bold">{formatRupiah(22000)}</span>
                </div>
                <div className="text-[9px] text-stone-500 pl-2">
                  - Level 2: Pedas Mantap
                </div>
              </div>

              <div className="border-b border-dashed border-stone-300 my-2" />

              {/* Mock summary */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(50000)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-200">
                  <span>TOTAL TAGIHAN</span>
                  <span>{formatRupiah(50000)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Metode: QRIS</span>
                  <span>{formatRupiah(50000)}</span>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-stone-400 my-2" />

              {/* Footer notes */}
              <div className="text-center space-y-1 pt-1 text-[9px] text-stone-600">
                <p>{formData.receiptFooter || 'Terima kasih atas kunjungan Anda!'}</p>
                {formData.receiptSocial && (
                  <p className="font-bold">{formData.receiptSocial}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
