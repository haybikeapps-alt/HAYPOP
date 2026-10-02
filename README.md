# HAYPOP — Kasir Pintar Modern

Aplikasi POS untuk HAYPOP F&B dengan manajemen kasir/admin, inventori, transaksi, pembayaran, laporan keuangan, pengaturan struk, dan penyimpanan SQLite persisten.

## Menjalankan aplikasi

Prasyarat: Node.js dan Bun.

    bun install
    bun run dev

Build produksi:

    bun run build

Type-check:

    bun run lint

Server aplikasi dijalankan melalui server.ts dan menggunakan SQLite untuk penyimpanan persisten lokal.

## Struktur utama

- src/ — aplikasi React dan komponen UI.
- server.ts — REST API dan static server.
- server/db.ts — skema dan inisialisasi SQLite.
- public/ — aset PWA.
- vite.config.ts — konfigurasi Vite dan PWA.

## Catatan konfigurasi

Tidak ada konfigurasi Google AI Studio yang diperlukan untuk menjalankan HAYPOP.
