import { Transaction, StoreSettings } from '../types';
import { formatRupiah } from './storage';

// Bluetooth GATT printer standard service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Bluetooth Serial
  '0000e0ff-0000-1000-8000-00805f9b34fb',
];

interface BluetoothCharacteristicLike {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryServices(): Promise<Array<{
        getCharacteristics(): Promise<BluetoothCharacteristicLike[]>;
      }>>;
    }>;
  };
}

interface NavigatorWithBluetooth {
  bluetooth: {
    requestDevice(options: {
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }): Promise<BluetoothDeviceLike>;
  };
}

export interface BluetoothConnectionState {
  isSupported: boolean;
  isConnected: boolean;
  deviceName?: string;
  error?: string;
}

let activeCharacteristic: BluetoothCharacteristicLike | null = null;
let activeDevice: BluetoothDeviceLike | null = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isWebBluetoothSupported()) {
    return {
      success: false,
      error: 'Web Bluetooth API tidak didukung pada browser ini. Silakan gunakan Google Chrome di Android / PC atau gunakan fitur Cetak Sistem.',
    };
  }

  try {
    const nav = navigator as unknown as NavigatorWithBluetooth;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000e0ff-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device || !device.gatt) {
      throw new Error('Perangkat Bluetooth tidak memiliki profil GATT.');
    }

    const server = await device.gatt.connect();

    // Find first writable characteristic
    let foundChar: BluetoothCharacteristicLike | null = null;
    const services = await server.getPrimaryServices();

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
      } catch {
        // continue
      }
      if (foundChar) break;
    }

    if (!foundChar) {
      throw new Error('Karakteristik penulisan ESC/POS tidak ditemukan pada printer ini.');
    }

    activeDevice = device;
    activeCharacteristic = foundChar;

    return {
      success: true,
      deviceName: device.name || 'Thermal Bluetooth Printer',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Koneksi bluetooth dibatalkan atau gagal.';
    return { success: false, error: message };
  }
}

export function isPrinterConnected(): boolean {
  return !!activeDevice && !!activeDevice.gatt && activeDevice.gatt.connected;
}

export function getConnectedDeviceName(): string | undefined {
  return activeDevice?.name;
}

// Generate ESC/POS byte commands for 58mm (32 chars) / 80mm (48 chars)
export function generateEscPosReceipt(trx: Transaction, settings: StoreSettings): Uint8Array {
  const is80mm = settings.paperWidth === '80mm';
  const lineWidth = is80mm ? 48 : 32;

  const enc = new TextEncoder();
  const buffer: number[] = [];

  // Helper push bytes
  const push = (...bytes: number[]) => buffer.push(...bytes);
  const pushText = (text: string) => {
    const encoded = enc.encode(text);
    for (let i = 0; i < encoded.length; i++) buffer.push(encoded[i]);
  };
  const pushLine = (text: string) => {
    pushText(text + '\n');
  };

  // Alignments: 0 = Left, 1 = Center, 2 = Right
  const align = (n: 0 | 1 | 2) => push(0x1b, 0x61, n);
  const bold = (on: boolean) => push(0x1b, 0x45, on ? 1 : 0);
  const textSize = (heightMult: number, widthMult: number) => {
    push(0x1d, 0x21, ((widthMult - 1) << 4) | (heightMult - 1));
  };
  const hr = (char = '-') => pushLine(char.repeat(lineWidth));

  const formatCols = (col1: string, col2: string): string => {
    const space = lineWidth - col1.length - col2.length;
    if (space <= 0) return `${col1.slice(0, lineWidth - col2.length - 1)} ${col2}`;
    return col1 + ' '.repeat(space) + col2;
  };

  // 1. Initialize printer
  push(0x1b, 0x40);

  // 2. Header
  align(1); // Center
  bold(true);
  textSize(2, 2);
  pushLine(settings.storeName.toUpperCase());
  textSize(1, 1);
  bold(false);

  if (settings.tagline) {
    pushLine(settings.tagline);
  }
  if (settings.address) {
    pushLine(settings.address);
  }
  if (settings.phone) {
    pushLine('Telp/WA: ' + settings.phone);
  }

  hr('=');

  // 3. Metadata
  align(0); // Left
  pushLine(`No  : ${trx.invoiceNumber}`);
  const dateFormatted = new Date(trx.timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  pushLine(`Tgl : ${dateFormatted}`);
  pushLine(`Kasir: ${trx.cashierName}`);
  if (trx.customer?.maskedPhone) {
    pushLine(`Pelanggan: ${trx.customer.maskedName || 'Customer'} (${trx.customer.maskedPhone})`);
  }

  hr('-');

  // 4. Items
  trx.items.forEach((item) => {
    align(0);
    bold(true);
    pushLine(`${item.productName}`);
    bold(false);

    // Modifiers list
    if (item.modifiersSummary && item.modifiersSummary.length > 0) {
      item.modifiersSummary.forEach((mod) => {
        pushLine(` + ${mod}`);
      });
    }

    const qtyPrice = ` ${item.quantity} x ${formatRupiah(item.unitPrice)}`;
    const lineTotal = formatRupiah(item.totalPrice);
    pushLine(formatCols(qtyPrice, lineTotal));
  });

  hr('-');

  // 5. Financial Totals
  pushLine(formatCols('Subtotal', formatRupiah(trx.subtotal)));
  if (trx.discount > 0) {
    pushLine(formatCols('Diskon', `-${formatRupiah(trx.discount)}`));
  }
  if (trx.tax > 0) {
    pushLine(formatCols(`PPN (${settings.taxPercentage}%)`, formatRupiah(trx.tax)));
  }

  bold(true);
  pushLine(formatCols('TOTAL AKHIR', formatRupiah(trx.totalAmount)));
  bold(false);

  hr('-');

  // 6. Payment details
  const methodLabel = trx.paymentMethod.toUpperCase();
  pushLine(formatCols(`Bayar (${methodLabel})`, formatRupiah(trx.amountPaid)));
  if (trx.paymentMethod === 'cash') {
    pushLine(formatCols('Kembalian', formatRupiah(trx.change)));
  }

  hr('=');

  // 7. Footer
  align(1);
  if (settings.receiptFooter) {
    settings.receiptFooter.split('\n').forEach((line) => {
      pushLine(line.trim());
    });
  }
  if (settings.receiptSocial) {
    pushLine(settings.receiptSocial);
  }
  pushLine('Powered by HAYPOP POS');

  // Paper cut & feed
  pushLine('\n\n\n');
  push(0x1d, 0x56, 0x42, 0x00); // Partial cut with feed

  return new Uint8Array(buffer);
}

export async function printDirectThermal(trx: Transaction, settings: StoreSettings): Promise<{ success: boolean; error?: string }> {
  if (!activeCharacteristic) {
    return {
      success: false,
      error: 'Printer bluetooth belum terhubung. Silakan klik tombol "Hubungkan Bluetooth Printer" terlebih dahulu.',
    };
  }

  try {
    const rawData = generateEscPosReceipt(trx, settings);
    // Send in chunks of 512 bytes for reliable BLE transmission
    const CHUNK_SIZE = 512;
    for (let i = 0; i < rawData.length; i += CHUNK_SIZE) {
      const slice = rawData.slice(i, i + CHUNK_SIZE);
      await activeCharacteristic.writeValue(slice);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengirim data cetak ke printer bluetooth.';
    return { success: false, error: message };
  }
}
