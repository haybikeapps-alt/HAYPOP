import React, { useState, useEffect } from 'react';
import { User, StoreSettings, Product } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getStoreSettings,
  getStoredProducts,
} from './utils/storage';
import {
  apiGetCurrentUser,
  apiGetProducts,
  apiGetStoreSettings,
} from './utils/api';
import { Navbar, ActiveNavTab } from './components/Navbar';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { RoleSwitchModal } from './components/RoleSwitchModal';
import { POSView } from './components/POSView';
import { TransactionHistory } from './components/TransactionHistory';
import { AdminFinancialReport } from './components/AdminFinancialReport';
import { AdminFinancialAccounts } from './components/AdminFinancialAccounts';
import { AdminExpenseManagement } from './components/AdminExpenseManagement';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminStockManagement } from './components/AdminStockManagement';
import { AdminUserManagement } from './components/AdminUserManagement';
import { AdminReceiptSettings } from './components/AdminReceiptSettings';
import { AdminPaymentSettings } from './components/AdminPaymentSettings';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getCurrentUser());
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('pos');
  const [isRoleSwitchOpen, setIsRoleSwitchOpen] = useState(false);

  // Supabase Auth + PostgreSQL are authoritative. LocalStorage is only a fast cache.
  useEffect(() => {
    apiGetCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentUserState(user);

        Promise.all([apiGetProducts(), apiGetStoreSettings()]).then(([freshProducts, freshSettings]) => {
          if (freshProducts) {
            setProducts(freshProducts);
          }
          if (freshSettings) {
            setStoreSettings(freshSettings);
          }
        });
      } else {
        setCurrentUserState(null);
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'kasir' && activeTab !== 'pos' && activeTab !== 'history') {
      setActiveTab('pos');
    }
  }, [currentUser, activeTab]);

  const handleSelectUser = (newUser: User) => {
    setCurrentUser(newUser);
    setCurrentUserState(newUser);
    if (newUser.role === 'kasir' && activeTab !== 'pos' && activeTab !== 'history') {
      setActiveTab('pos');
    }
  };

  const handleRefreshData = async () => {
    const freshProducts = await apiGetProducts();
    if (freshProducts) {
      setProducts(freshProducts);
      return;
    }
    setProducts(getStoredProducts());
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <RoleSwitchModal
          currentUser={null}
          onSelectUser={handleSelectUser}
          onClose={() => undefined}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 font-sans">
      <OfflineSyncBanner onSyncComplete={handleRefreshData} />
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRoleSwitch={() => setIsRoleSwitchOpen(true)}
        storeSettings={storeSettings}
      />

      <main className="flex-1 flex flex-col">
        {activeTab === 'pos' && (
          <POSView
            products={products}
            currentUser={currentUser}
            storeSettings={storeSettings}
            onRefreshData={handleRefreshData}
          />
        )}

        {activeTab === 'history' && (
          <TransactionHistory currentUser={currentUser} storeSettings={storeSettings} />
        )}

        {currentUser.role === 'admin' && (
          <>
            {activeTab === 'analytics' && <AdminAnalytics />}
            {activeTab === 'finance' && <AdminFinancialReport />}
            {activeTab === 'financial_accounts' && <AdminFinancialAccounts />}
            {activeTab === 'expenses' && <AdminExpenseManagement />}
            {activeTab === 'inventory' && (
              <AdminStockManagement onProductsUpdated={handleRefreshData} />
            )}
            {activeTab === 'users' && <AdminUserManagement currentUser={currentUser} />}
            {activeTab === 'payment_settings' && (
              <AdminPaymentSettings onSettingsSaved={handleRefreshData} />
            )}
            {activeTab === 'receipt_settings' && (
              <AdminReceiptSettings settings={storeSettings} onSettingsSaved={setStoreSettings} />
            )}
          </>
        )}
      </main>

      {isRoleSwitchOpen && (
        <RoleSwitchModal
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onClose={() => setIsRoleSwitchOpen(false)}
        />
      )}
    </div>
  );
}
