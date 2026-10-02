import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, RefreshCw, AlertCircle, HardDrive, Download } from 'lucide-react';
import { checkDatabaseStatus, DatabaseStatus } from '../utils/api';
import { syncAllDataWithDatabase } from '../utils/storage';

export const DatabaseStatusBadge: React.FC<{ onSyncComplete?: () => void }> = ({ onSyncComplete }) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStatus = async () => {
    const s = await checkDatabaseStatus();
    setStatus(s);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncAllDataWithDatabase();
    await fetchStatus();
    setIsSyncing(false);
    if (onSyncComplete) onSyncComplete();
  };

  const handleDownloadBackup = () => {
    window.open('/api/database/backup', '_blank');
  };

  const isConnected = status?.status === 'connected';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
          isConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
        }`}
        title="Status Koneksi Database SQLite"
      >
        <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-600' : 'text-stone-400'}`} />
        <span className="hidden sm:inline">DB SQLite:</span>
        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>{isConnected ? 'Aktif' : 'Offline'}</span>
        </span>
      </button>

      {/* Popover Details */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-xl border border-emerald-100 p-4 z-50 animate-in fade-in duration-150 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <HardDrive className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-stone-900">Database SQLite Server</h4>
                <p className="text-[10px] text-stone-400">Penyimpanan Relasional Terpusat</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl">
              <span className="text-stone-500 text-[11px]">Status Mesin:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {status?.engine || 'SQLite'}
              </span>
            </div>

            <div className="flex justify-between items-center px-1 text-[11px]">
              <span className="text-stone-500">File Database:</span>
              <span className="font-mono text-stone-700 font-semibold">{status?.databaseFile || 'data/haypop.sqlite'}</span>
            </div>

            {status?.counts && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100 text-[11px]">
                <div className="bg-stone-50 p-2 rounded-xl">
                  <span className="text-stone-400 block text-[10px]">Total Produk:</span>
                  <span className="font-bold text-stone-900 text-sm">{status.counts.products}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-xl">
                  <span className="text-stone-400 block text-[10px]">Transaksi DB:</span>
                  <span className="font-bold text-stone-900 text-sm">{status.counts.transactions}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition cursor-pointer"
              title="Download Cadangan Database (.json)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
