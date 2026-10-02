import { CustomerData, EncryptedCustomerData } from '../types';

// Built-in device/store encryption key seed (can be stored locally per store installation)
const ENCRYPTION_SECRET = 'HAYPOP-SECURE-KEY-POS-2026-F&B-ENCRYPTION';

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('haypop_salt_aes_gcm'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptCustomerData(data: CustomerData): Promise<EncryptedCustomerData> {
  try {
    const key = await getKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(data));

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    const maskedPhone = data.phone
      ? data.phone.length > 5
        ? `${data.phone.slice(0, 3)}****${data.phone.slice(-3)}`
        : '****'
      : '';

    const maskedName = data.name
      ? data.name.length > 2
        ? `${data.name[0]}***${data.name.slice(-1)}`
        : data.name
      : '';

    return {
      encryptedPayload: bufferToBase64(encryptedContent),
      iv: bufferToBase64(iv.buffer),
      isEncrypted: true,
      maskedName: maskedName || (data.name ? 'Pelanggan' : undefined),
      maskedPhone: maskedPhone || undefined,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback if Web Crypto is unavailable
    return {
      encryptedPayload: window.btoa(JSON.stringify(data)),
      iv: 'plain',
      isEncrypted: false,
      maskedName: data.name,
      maskedPhone: data.phone,
    };
  }
}

export async function decryptCustomerData(encData: EncryptedCustomerData): Promise<CustomerData | null> {
  try {
    if (!encData.isEncrypted || encData.iv === 'plain') {
      return JSON.parse(window.atob(encData.encryptedPayload));
    }

    const key = await getKey();
    const ivBuffer = base64ToBuffer(encData.iv);
    const dataBuffer = base64ToBuffer(encData.encryptedPayload);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      key,
      dataBuffer
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedContent));
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}
