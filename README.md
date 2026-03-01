# Sistem Antrean Digital DPMPTSP Kabupaten Lombok Barat

Aplikasi manajemen antrean terintegrasi yang dirancang khusus untuk meningkatkan efisiensi pelayanan publik pada Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu (DPMPTSP) Kabupaten Lombok Barat. Sistem ini mendukung model hybrid untuk sinkronisasi antrean online dan operasional offline secara real-time.

## 🌟 Fitur Utama

### Sisi Masyarakat (Public Interface)
- **Reservasi Antrean Online**: Pengambilan nomor antrean berdasarkan kategori layanan dan slot waktu yang tersedia.
- **E-Ticket & QR Code**: Tiket digital otomatis tersimpan di perangkat user untuk proses verifikasi di loket.
- **Monitoring Live**: Pantau posisi antrean yang sedang dilayani secara real-time dari mana saja untuk menghindari penumpukan di lokasi.
- **Riwayat Mandiri**: Fitur bagi user untuk melihat riwayat kunjungan dan pembatalan antrean secara personal.
- **Sistem Notifikasi**: Peringatan visual dan suara (TTS) saat nomor antrean mulai dipanggil.

### Sisi Administrator (Admin Panel)
- **Console Operasional**: Manajemen panggilan antrean (Panggil, Panggil Ulang, Selesai, dan Skip).
- **Log Sistem & Audit Trail**: Pencatatan otomatis setiap aksi admin dan aktivitas sistem untuk keamanan data.
- **Rekapitulasi Data**: Fitur filter data berdasarkan periode, layanan, hingga slot waktu dengan kemampuan ekspor ke Excel.
- **Manajemen Layanan**: Konfigurasi dinamis untuk jenis layanan, kode prefix (A, B, C, dst), dan deskripsi.
- **Auto-Cancel System**: Logika otomatis untuk membatalkan antrean yang kadaluarsa atau tidak hadir.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database & Real-time**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: Tailwind CSS & Shadcn/UI
- **Icons**: Lucide React
- **Logging**: Custom Internal Logger System
- **Export**: XLSX Library

## 📋 Persyaratan Sistem

- Node.js 18.x atau versi terbaru
- Akun Supabase (untuk Database & Real-time SDK)
- Koneksi Internet (untuk sinkronisasi real-time)

## ⚡ Instalasi Cepat

### 1. Clone Repositori
```bash
git clone <repository-url>
cd sistem-antrean-dpmptsp
```

### 2. Konfigurasi Environment
Buat file `.env.local` di root folder:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Inisialisasi Database
Jalankan skrip SQL inisialisasi tabel `services`, `bookings`, dan `system_logs` pada SQL Editor di Dashboard Supabase.

### 4. Instalasi Dependensi & Jalankan
```bash
npm install
npm run dev
```

## 🔒 Keamanan & Performa

- **Row Level Security (RLS)**: Menjamin data antrean hanya dapat diubah oleh pihak yang berwenang melalui kebijakan database.
- **Error Handling**: Implementasi Global Error Boundary dan Fallback UI untuk menjaga stabilitas sistem saat terjadi gangguan.
- **Rate Limiting**: Proteksi sisi klien dan server terhadap spamming pengambilan nomor antrean.
- **Optimized Indexing**: Struktur database telah dioptimasi untuk menangani query data log dan riwayat dalam jumlah besar secara cepat.

## 📱 Struktur Halaman

| Jalur (Route)        | Deskripsi                        | Otoritas |
|----------------------|----------------------------------|----------|
| `/`                  | Beranda Utama                    | Publik   |
| `/booking`           | Form Reservasi Antrean           | Publik   |
| `/monitor-antrean`   | Live Monitoring Antrean          | Publik   |
| `/riwayat-antrean`   | Riwayat Personal User            | Publik   |
| `/admin/login`       | Portal Autentikasi Admin         | Publik   |
| `/admin/antrean`     | Dashboard Operasional Loket      | Admin    |
| `/admin/rekap`       | Laporan & Ekspor Data            | Admin    |
| `/admin/logs`        | Audit Trail Sistem               | Admin    |

## 📝 Lisensi & Pengembangan

Proyek ini dikembangkan dalam rangka Praktek Kerja Lapangan (PKL) pada Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu (DPMPTSP) Kabupaten Lombok Barat.

Dikembangkan oleh **Fiqro Najiah (Masfiq)** — 2026