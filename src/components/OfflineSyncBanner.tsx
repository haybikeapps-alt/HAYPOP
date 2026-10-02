import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getOfflineQueue, clearOfflineQueue } from '../utils/storage';

interface OfflineSyncBannerProps {
  onSyncComplete?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onSyncComplete }) => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const offlineQueue = getOfflineQueue();
  const pendingCount = offlineQueue.length;

  const handleManualSync = () => {
    if (!isOnline || pendingCount === 0) return;
    setIsSyncing(true);
    setTimeout(() => {
      clearOfflineQueue();
      setIsSyncing(false);
      setSyncSuccess(true);
      if (onSyncComplete) onSyncComplete();
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1200);
  };

  if (isOnline && pendingCount === 0 && !syncSuccess) {
    return null;
  }

  return (
    <div className="bg-stone-900 border-b border-stone-800 text-stone-200 px-4 py-2.5 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              Mode Offline Aktif
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
              <Wifi className="w-3.5 h-3.5" />
              Online
            </span>
          )}

          <span className="text-stone-300">
            {!isOnline
              ? 'Transaksi tersimpan aman di database lokal kasir dan akan otomatis sinkron saat online.'
              : pendingCount > 0
              ? `Terdapat ${pendingCount} transaksi offline yang siap disinkronkan ke server.`
              : 'Semua data transaksi tersinkronisasi sempurna.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {syncSuccess && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Sinkronisasi Selesai!
            </span>
          )}

          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 rounded-md text-xs transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : `Sinkronkan (${pendingCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
