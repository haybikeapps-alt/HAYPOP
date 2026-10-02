# HAYPOP — Initial Audit

Tanggal audit: 2026-10-02
Branch: chore/remove-ai-studio-audit

## 1. Status Google AI Studio

Ditemukan jejak starter Google AI Studio pada baseline:

- README masih berisi instruksi dan tautan aplikasi AI Studio.
- `package.json` memiliki dependency `@google/genai` tanpa penggunaan yang terlihat pada kode aplikasi yang diaudit.
- `bun.lock` mengunci dependency `@google/genai`.
- `metadata.json` menyatakan capability server-side Gemini API.
- `vite.config.ts` memiliki komentar/configuration yang secara eksplisit menyebut AI Studio.

Tindakan pada branch ini:

- Mengganti README dengan dokumentasi HAYPOP.
- Menghapus `@google/genai` dari dependency.
- Menghapus metadata capability Gemini.
- Menghapus referensi AI Studio dari konfigurasi Vite.
- Menghapus lockfile lama yang masih memuat dependency Gemini agar dapat dibuat ulang dari dependency HAYPOP yang sudah bersih.

## 2. Arsitektur yang ditemukan

- Frontend: React + TypeScript + Vite.
- Backend: Express dijalankan dari `server.ts`.
- Database: SQLite melalui `node:sqlite`.
- Offline layer: localStorage + queue sinkronisasi ke REST API.
- PWA: vite-plugin-pwa.

## 3. Temuan keamanan prioritas

### CRITICAL — API backend belum memiliki autentikasi/otorisasi

Endpoint CRUD untuk products, users, transactions, expenses, settings, dan payment settings dapat dipanggil dari server tanpa middleware autentikasi yang terlihat pada `server.ts`. Ini berarti pembatasan role yang ada di UI belum menjadi boundary keamanan backend.

**Dampak:** client yang dapat mengakses server berpotensi membaca atau mengubah data tanpa role admin/kasir yang benar.

**Rekomendasi:** tetapkan authentication/session mechanism, middleware authorization per role, dan validasi server-side untuk setiap mutasi.

### HIGH — PIN user tersimpan plaintext

Seed database dan storage frontend menyimpan PIN secara langsung, bukan hash.

**Rekomendasi:** jangan simpan PIN plaintext. Gunakan password/PIN hashing dengan salt dan verifikasi di server.

### HIGH — Data sensitif payment berada di source/seed data

Seed database dan local storage berisi nomor rekening, NMID, dan nomor e-wallet contoh. Walaupun kemungkinan merupakan data demo, data seperti ini harus diperlakukan sebagai konfigurasi sensitif dan tidak boleh menjadi secret yang tertanam di bundle frontend.

**Rekomendasi:** pindahkan konfigurasi payment yang sensitif ke backend/database dengan access control dan audit trail; verifikasi serta ganti nilai contoh sebelum production.

### HIGH — localStorage menjadi sumber data otorisasi dan data bisnis

User aktif, user list, transaksi, produk, expense, dan payment settings disimpan di localStorage. localStorage dapat dimodifikasi oleh pengguna/browser dan tidak boleh dipercaya untuk authorization atau integritas finansial.

**Rekomendasi:** jadikan server/database sebagai source of truth; localStorage hanya cache/offline queue yang tervalidasi saat sinkronisasi.

### MEDIUM — Validasi input REST API belum terlihat memadai

Endpoint menerima `req.body` lalu langsung menjalankan operasi database. Belum terlihat schema validation, batasan field, atau validasi role/status di layer API.

**Rekomendasi:** gunakan schema validation dan aturan bisnis server-side sebelum setiap INSERT/UPDATE/DELETE.

### MEDIUM — Seed data demo aktif saat database kosong

Database otomatis diisi produk, user, expense, transaksi, dan pengaturan ketika belum ada data.

**Rekomendasi:** pisahkan seed development dari production initialization dan sediakan mekanisme bootstrap admin yang aman.

## 4. Temuan kualitas/maintainability

- Nama package masih berupa starter sebelumnya dan pada branch ini sudah dinormalisasi menjadi `haypop`.
- Belum ditemukan pipeline CI pada file yang diaudit; build/type-check perlu dijadikan gate sebelum merge.
- Tidak terlihat test suite backend pada baseline yang diperiksa.
- Server menggabungkan bootstrap database, REST API, dan static/Vite serving dalam satu file; pemisahan route/service/middleware akan memudahkan pengujian dan security review.

## 5. Urutan pekerjaan berikutnya

1. Pastikan branch pembersihan AI Studio lulus install/build/type-check.
2. Tambahkan CI minimal untuk build dan type-check.
3. Implementasikan authentication + authorization backend.
4. Amankan PIN dan payment configuration.
5. Tambahkan validation layer dan tests untuk seluruh REST API.
6. Pisahkan seed development dari production.
7. Setelah baseline aman, lanjutkan pengembangan fitur HAYPOP.
