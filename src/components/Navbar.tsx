import React, { useState } from 'react';
import {
  ShoppingBag,
  History,
  BarChart3,
  TrendingUp,
  Boxes,
  Users,
  Printer,
  Download,
  Bluetooth,
  Lock,
  Menu,
  X,
  Coffee,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { User, StoreSettings } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isWebBluetoothSupported, isPrinterConnected, connectBluetoothPrinter } from '../utils/escpos';
import { DatabaseStatusBadge } from './DatabaseStatusBadge';

export type ActiveNavTab =
  | 'pos'
  | 'history'
  | 'analytics'
  | 'finance'
  | 'financial_accounts'
  | 'inventory'
  | 'users'
  | 'payment_settings'
  | 'receipt_settings';

interface NavbarProps {
  currentUser: User;
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  onOpenRoleSwitch: () => void;
  storeSettings: StoreSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenRoleSwitch,
  storeSettings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [btStatus, setBtStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const handleConnectBt = async () => {
    setBtStatus('connecting');
    const res = await connectBluetoothPrinter();
    if (res.success) {
      setBtStatus('connected');
      setBtDeviceName(res.deviceName || 'Thermal Printer');
    } else {
      setBtStatus('error');
      alert(res.error || 'Gagal menyambungkan bluetooth printer.');
    }
  };

  const navItems = [
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingBag, adminOnly: false },
    { id: 'history', label: 'Riwayat Transaksi', icon: History, adminOnly: false },
    { id: 'analytics', label: 'Dasbor Analitik', icon: BarChart3, adminOnly: true },
    { id: 'finance', label: 'Laporan & BEP', icon: TrendingUp, adminOnly: true },
    { id: 'financial_accounts', label: 'Rekening & Saldo', icon: Wallet, adminOnly: true },
    { id: 'inventory', label: 'Kelola Stok & Menu', icon: Boxes, adminOnly: true },
    { id: 'payment_settings', label: 'Pengaturan Pembayaran', icon: CreditCard, adminOnly: true },
    { id: 'receipt_settings', label: 'Pengaturan Struk', icon: Printer, adminOnly: true },
    { id: 'users', label: 'Manajemen User', icon: Users, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => (isAdmin ? true : !item.adminOnly));

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTabChange('pos')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                {storeSettings.logoDataUrl ? (
                  <img
                    src={storeSettings.logoDataUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-xl object-contain border border-emerald-200 bg-white p-0.5 shadow-xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold shadow-sm group-hover:scale-105 transition">
                    <Coffee className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-stone-900 group-hover:text-emerald-600 transition">
                      {storeSettings.storeName || 'HAYPOP'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider">
                      POS
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    {storeSettings.tagline || 'Fresh Drinks & Crispy Bites'}
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as ActiveNavTab)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Actions: Database Status, Bluetooth, PWA Install, Role Badge */}
            <div className="flex items-center gap-2">
              {/* SQLite Server Database Badge */}
              <DatabaseStatusBadge />

              {/* Bluetooth Thermal Quick Indicator */}
              <button
                onClick={handleConnectBt}
                title="Status Bluetooth Thermal Printer"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  btStatus === 'connected' || isPrinterConnected()
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Bluetooth className={`w-3.5 h-3.5 ${btStatus === 'connected' ? 'text-emerald-600' : 'text-stone-500'}`} />
                <span className="hidden xl:inline">
                  {btStatus === 'connected' ? btDeviceName || 'Printer Terhubung' : 'Bluetooth Thermal'}
                </span>
              </button>

              {/* PWA Install Button */}
              {isInstallable && (
                <button
                  onClick={install}
                  className="flex items-center gap-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              )}

              {/* iOS Safari Guide Button */}
              {isIOS && !isInstalled && (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-stone-200 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden sm:inline">Install iOS</span>
                </button>
              )}

              {/* User & Role Badge with Switcher */}
              <button
                onClick={onOpenRoleSwitch}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer text-left"
                title="Klik untuk berganti akun / PIN"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                    currentUser.role === 'admin' ? 'bg-emerald-700' : 'bg-teal-600'
                  }`}
                >
                  {currentUser.name[0]}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-stone-800 leading-tight flex items-center gap-1.5">
                    <span className="max-w-[120px] truncate">{currentUser.name}</span>
                    <Lock className="w-3 h-3 text-stone-400" />
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700 capitalize">
                    {currentUser.role === 'admin' ? '👑 Admin (Penuh)' : '💼 Kasir'}
                  </div>
                </div>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-1 shadow-lg">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-1">
              Menu Navigasi ({currentUser.role === 'admin' ? 'Akses Penuh' : 'Akses Kasir'})
            </div>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id as ActiveNavTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* iOS PWA Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Pasang HAYPOP di iPhone / iPad
            </h4>
            <div className="text-xs text-stone-600 space-y-2">
              <p>1. Buka halaman ini di browser <strong>Safari</strong>.</p>
              <p>2. Tekan tombol <strong>Share / Bagikan</strong> (ikon kotak dengan panah ke atas di bagian bawah Safari).</p>
              <p>3. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
              <p>4. Aplikasi kasir akan langsung tersedia offline di layar beranda perangkat Anda.</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-stone-800 transition cursor-pointer"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
