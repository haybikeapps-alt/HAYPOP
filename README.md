# HAYPOP

HAYPOP adalah aplikasi POS (Point of Sale) untuk pengelolaan penjualan, produk, stok, pembayaran, transaksi, dan laporan bisnis.

## Stack
- React + TypeScript + Vite
- Supabase Auth + PostgreSQL + Row Level Security
- PWA

## Menjalankan aplikasi
1. Install dependencies:
   `npm install`
2. Salin `.env.example` menjadi `.env.local`
3. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
4. Jalankan:
   `npm run dev`

## Catatan
Supabase adalah sumber data utama. Jangan menaruh `service_role` key di frontend atau repository.
