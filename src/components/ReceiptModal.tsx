import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  X,
  Share2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { Transaction, StoreSettings, CustomerData } from '../types';
import { formatRupiah } from '../utils/storage';
import { printDirectThermal, isPrinterConnected, connectBluetoothPrinter } from '../utils/escpos';
import { decryptCustomerData } from '../utils/crypto';

interface ReceiptModalProps {
  transaction: Transaction;
  storeSettings: StoreSettings;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  storeSettings,
  onClose,
  onNewTransaction,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(storeSettings.paperWidth || '58mm');
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [decryptedCustomer, setDecryptedCustomer] = useState<CustomerData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState(false);

  // Direct Bluetooth Print
  const handleBluetoothPrint = async () => {
    setPrintStatus('printing');
    setErrorMessage('');

    if (!isPrinterConnected()) {
      const conn = await connectBluetoothPrinter();
      if (!conn.success) {
        setPrintStatus('error');
        setErrorMessage(conn.error || 'Gagal menyambungkan Bluetooth printer.');
        return;
      }
    }

    const res = await printDirectThermal(transaction, {
      ...storeSettings,
      paperWidth,
    });

    if (res.success) {
      setPrintStatus('success');
      setTimeout(() => setPrintStatus('idle'), 3000);
    } else {
      setPrintStatus('error');
      setErrorMessage(res.error || 'Gagal mencetak ke printer bluetooth.');
    }
  };

  // Browser Print Dialog (Fallback / System Print)
  const handleSystemPrint = () => {
    window.print();
  };

  // Toggle Customer E2E Decryption
  const handleToggleDecrypt = async () => {
    if (showDecrypted) {
      setShowDecrypted(false);
      return;
    }

    if (!transaction.customer) return;

    if (!decryptedCustomer) {
      setIsDecrypting(true);
      const res = await decryptCustomerData(transaction.customer);
      setDecryptedCustomer(res);
      setIsDecrypting(false);
    }
    setShowDecrypted(true);
  };

  const logoAlignClass =
    storeSettings.logoAlignment === 'left'
      ? 'text-left'
      : storeSettings.logoAlignment === 'right'
      ? 'text-right'
      : 'text-center';

  const logoImgAlignClass =
    storeSettings.logoAlignment === 'left'
      ? 'mr-auto'
      : storeSettings.logoAlignment === 'right'
      ? 'ml-auto'
      : 'mx-auto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-stone-100 rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/60 text-emerald-200 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Struk Kasir Digital & Thermal</h3>
              <p className="text-[11px] text-emerald-200">{transaction.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper width toggle */}
            <div className="bg-black/20 p-1 rounded-xl flex items-center text-xs font-bold text-stone-200">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paperWidth === '58mm' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-white'
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paperWidth === '80mm' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-white'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-stone-200/70">
          {/* Authentic Thermal Paper Card */}
          <div
            id="printable-receipt"
            className={`bg-white text-stone-900 font-mono text-[11px] sm:text-xs leading-tight p-5 sm:p-6 shadow-md rounded-lg border border-stone-300 transition-all ${
              paperWidth === '58mm' ? 'w-[320px]' : 'w-[440px]'
            }`}
          >
            {/* Store Logo */}
            {storeSettings.showLogoOnReceipt && (
              <div className={`mb-3 ${logoAlignClass}`}>
                {storeSettings.logoDataUrl ? (
                  <img
                    src={storeSettings.logoDataUrl}
                    alt="Logo Toko"
                    className={`max-h-14 object-contain ${logoImgAlignClass}`}
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black text-sm mb-1 ${logoImgAlignClass}`}
                  >
                    HP
                  </div>
                )}
              </div>
            )}

            {/* Store Header */}
            <div className="text-center space-y-0.5 pb-2">
              <h2 className="font-extrabold text-base tracking-wider text-stone-900 uppercase">
                {storeSettings.storeName}
              </h2>
              {storeSettings.tagline && (
                <p className="text-[10px] text-stone-600 font-medium">{storeSettings.tagline}</p>
              )}
              {storeSettings.address && (
                <p className="text-[10px] text-stone-500">{storeSettings.address}</p>
              )}
              {storeSettings.phone && (
                <p className="text-[10px] text-stone-500">Telp: {storeSettings.phone}</p>
              )}
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-2" />

            {/* Transaction Metadata */}
            <div className="space-y-0.5 text-[10px] text-stone-700">
              <div className="flex justify-between">
                <span>No. Inv</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>
                  {new Date(transaction.timestamp).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{transaction.cashierName}</span>
              </div>

              {/* Customer info */}
              {transaction.customer && (
                <div className="pt-1 border-t border-stone-200 mt-1">
                  <div className="flex justify-between items-center text-stone-600">
                    <span className="flex items-center gap-1">
                      Pelanggan:
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    </span>
                    <span className="font-semibold">
                      {showDecrypted && decryptedCustomer
                        ? `${decryptedCustomer.name} (${decryptedCustomer.phone})`
                        : `${transaction.customer.maskedName || 'Customer'} (${
                            transaction.customer.maskedPhone || 'Terenkripsi'
                          })`}
                    </span>
                  </div>
                  {showDecrypted && decryptedCustomer?.notes && (
                    <div className="text-[9px] text-stone-500 italic mt-0.5">
                      Catatan: {decryptedCustomer.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-2" />

            {/* Order Items */}
            <div className="space-y-2 py-1">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-stone-900">{item.productName}</div>
                  {item.modifiersSummary && item.modifiersSummary.length > 0 && (
                    <div className="text-[9px] text-stone-600 pl-2 space-y-0.5">
                      {item.modifiersSummary.map((m, mIdx) => (
                        <div key={mIdx}>+ {m}</div>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <div className="text-[9px] text-stone-500 italic pl-2">Note: {item.note}</div>
                  )}
                  <div className="flex justify-between text-stone-700">
                    <span>
                      {item.quantity} x {formatRupiah(item.unitPrice)}
                    </span>
                    <span className="font-semibold">{formatRupiah(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-2" />

            {/* Totals */}
            <div className="space-y-1 text-stone-800">
              <div className="flex justify-between text-[10px]">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-[10px] text-red-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>PPN ({storeSettings.taxPercentage}%)</span>
                  <span>{formatRupiah(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm border-t border-stone-800 pt-1 text-stone-900">
                <span>TOTAL</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-[10px] pt-1">
                <span className="uppercase">Bayar ({transaction.paymentMethod})</span>
                <span>{formatRupiah(transaction.amountPaid)}</span>
              </div>
              {transaction.paymentMethod === 'cash' && (
                <div className="flex justify-between text-[10px]">
                  <span>Kembalian</span>
                  <span>{formatRupiah(transaction.change)}</span>
                </div>
              )}
            </div>

            <div className="border-b-2 border-dashed border-stone-400 my-2" />

            {/* Footer */}
            <div className="text-center space-y-1 text-[10px] text-stone-600 pt-1">
              {storeSettings.receiptFooter && (
                <p className="whitespace-pre-line leading-normal">{storeSettings.receiptFooter}</p>
              )}
              {storeSettings.receiptSocial && (
                <p className="font-semibold text-stone-800">{storeSettings.receiptSocial}</p>
              )}
              <p className="text-[9px] text-stone-400 pt-1">*** SIMPAN STRUK INI SEBAGAI BUKTI PEMBAYARAN ***</p>
            </div>
          </div>
        </div>

        {/* Customer Decrypt Toggle & Bluetooth status info */}
        {transaction.customer && (
          <div className="bg-stone-50 border-t border-stone-200 px-6 py-2.5 flex items-center justify-between text-xs text-stone-600">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Data pelanggan terenkripsi E2E (AES-256)
            </span>
            <button
              onClick={handleToggleDecrypt}
              disabled={isDecrypting}
              className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              {showDecrypted ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Tutup Data Asli
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Dekripsi Data Asli
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-2 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onNewTransaction}
            className="flex-1 min-w-[130px] px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-50 text-xs sm:text-sm transition cursor-pointer text-center"
          >
            Transaksi Baru
          </button>

          {/* System Print (works on all devices) */}
          <button
            onClick={handleSystemPrint}
            className="flex-1 min-w-[130px] px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100 text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sistem</span>
          </button>

          {/* Direct Bluetooth ESC/POS Print */}
          <button
            onClick={handleBluetoothPrint}
            disabled={printStatus === 'printing'}
            className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Bluetooth className={`w-4 h-4 ${printStatus === 'printing' ? 'animate-spin' : ''}`} />
            <span>
              {printStatus === 'printing'
                ? 'Mengirim...'
                : printStatus === 'success'
                ? 'Tercetak!'
                : 'Cetak Bluetooth Langsung'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
