import React, { useState, useEffect } from 'react';
import { User, StoreSettings, Product } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getStoreSettings,
  getStoredProducts,
  syncAllDataWithDatabase,
} from './utils/storage';
import { Navbar, ActiveNavTab } from './components/Navbar';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { RoleSwitchModal } from './components/RoleSwitchModal';
import { POSView } from './components/POSView';
import { TransactionHistory } from './components/TransactionHistory';
import { AdminFinancialReport } from './components/AdminFinancialReport';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminStockManagement } from './components/AdminStockManagement';
import { AdminUserManagement } from './components/AdminUserManagement';
import { AdminReceiptSettings } from './components/AdminReceiptSettings';
import { AdminPaymentSettings } from './components/AdminPaymentSettings';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('pos');
  const [isRoleSwitchOpen, setIsRoleSwitchOpen] = useState(false);

  // Safety check: if role is 'kasir', force active tab to be pos or history
  useEffect(() => {
    if (currentUser.role === 'kasir') {
      if (activeTab !== 'pos' && activeTab !== 'history') {
        setActiveTab('pos');
      }
    }
  }, [currentUser, activeTab]);

  // Sync with persistent SQLite database on mount
  useEffect(() => {
    syncAllDataWithDatabase().then((success) => {
      if (success) {
        setProducts(getStoredProducts());
        setStoreSettings(getStoreSettings());
      }
    });
  }, []);

  const handleSelectUser = (newUser: User) => {
    setCurrentUser(newUser);
    setCurrentUserState(newUser);
    if (newUser.role === 'kasir' && activeTab !== 'pos' && activeTab !== 'history') {
      setActiveTab('pos');
    }
  };

  const handleRefreshData = () => {
    setProducts(getStoredProducts());
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 font-sans">
      {/* Offline sync banner */}
      <OfflineSyncBanner onSyncComplete={handleRefreshData} />

      {/* Main Top Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRoleSwitch={() => setIsRoleSwitchOpen(true)}
        storeSettings={storeSettings}
      />

      {/* Main View Area */}
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
          <TransactionHistory
            currentUser={currentUser}
            storeSettings={storeSettings}
          />
        )}

        {/* Admin Only Views */}
        {currentUser.role === 'admin' && (
          <>
            {activeTab === 'analytics' && <AdminAnalytics />}
            {activeTab === 'finance' && <AdminFinancialReport />}
            {activeTab === 'inventory' && (
              <AdminStockManagement onProductsUpdated={handleRefreshData} />
            )}
            {activeTab === 'users' && <AdminUserManagement currentUser={currentUser} />}
            {activeTab === 'payment_settings' && (
              <AdminPaymentSettings onSettingsSaved={handleRefreshData} />
            )}
            {activeTab === 'receipt_settings' && (
              <AdminReceiptSettings
                settings={storeSettings}
                onSettingsSaved={setStoreSettings}
              />
            )}
          </>
        )}
      </main>

      {/* Role Switcher Modal */}
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
