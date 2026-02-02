# Setup Guide - Sistem Antrian Dinas Penanaman Modal dan Perizinan

## Pengantar

Aplikasi ini adalah sistem booking antrian online-offline hybrid untuk Dinas Penanaman Modal dan Perizinan. Berikut langkah-langkah setup untuk menjalankan aplikasi.

## Prasyarat

- Node.js 18+ 
- Akun Supabase (gratis di https://supabase.com)
- Text editor / IDE (VS Code recommended)

## Langkah Setup

### 1. Setup Supabase

1. **Buat Project Supabase**
   - Kunjungi https://supabase.com
   - Buat akun atau login
   - Buat project baru
   - Salin `Project URL` dan `Anon Key` dari Settings > API

2. **Buat Environment Variables**
   - Buat file `.env.local` di root project
   - Tambahkan variabel berikut:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Setup Database Schema**
   - Buka SQL Editor di Supabase Dashboard
   - Copy isi file `/scripts/init-database.sql`
   - Paste ke SQL Editor
   - Klik "Run" untuk menjalankan migration

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Application

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## Fitur Aplikasi

### Halaman User (Public)
- **`/`** - Halaman utama dengan opsi booking dan cek status
- **`/booking`** - Form booking antrian dengan:
  - Input nama lengkap
  - Input nomor telepon
  - Pilih jenis layanan (21 layanan tersedia)
- **`/booking-confirmation/[id]`** - Halaman konfirmasi dengan:
  - Nomor antrian
  - QR Code yang dapat discan/cetak
  - Detail booking lengkap
- **`/dashboard`** - Real-time queue status dengan:
  - Daftar antrian yang sedang menunggu
  - Filter berdasarkan status (menunggu/dilayani/selesai)
  - Search antrian berdasarkan nomor/nama
  - Statistik antrian real-time

### Halaman Admin (Protected)
- **`/admin/login`** - Login admin dengan:
  - Email: `admin@dinas.go.id`
  - Password: `dinas2024`
  
- **`/admin/dashboard`** - Dashboard admin dengan:
  - **Tab Manajemen Antrian:**
    - Lihat semua antrian dengan posisi
    - Update status antrian (waiting → in_progress → completed)
    - Real-time updates
  
  - **Tab Manajemen Layanan (CRUD):**
    - Tambah layanan baru
    - Edit layanan yang ada
    - Hapus layanan
    - Edit deskripsi dan estimasi waktu

## Alur Sistem Hybrid Online-Offline

### Online Flow (Web)
1. User mengisi form booking di website
2. Sistem generate nomor antrian + QR Code
3. User mendapatkan konfirmasi dengan nomor antrian
4. User bisa cek status di dashboard real-time

### Offline Flow (Physical)
1. Petugas di kantor melihat antrian di admin dashboard
2. Petugas update status antrian saat melayani customer
3. System secara real-time update di dashboard user
4. Nomor antrian online dan offline terintegrasi dalam satu sistem

### Integrasi Hybrid
- Satu database terpusat di Supabase
- Real-time updates menggunakan Supabase subscriptions
- Admin dapat melihat dan mengelola semua antrian (online + offline)
- User dapat melihat status mereka kapan saja di web

## Admin Credentials (Demo)

**Email:** admin@dinas.go.id  
**Password:** dinas2024

⚠️ **PENTING:** Ganti credentials ini di production environment!

Untuk mengubah, edit file `/app/api/admin/login/route.ts`

## Database Schema

### Services Table
```sql
- id: UUID (Primary Key)
- name: VARCHAR (255)
- description: TEXT
- estimated_duration: INTEGER (dalam menit)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Bookings Table
```sql
- id: UUID (Primary Key)
- booking_number: VARCHAR (50) - Nomor antrian unik
- visitor_name: VARCHAR (255)
- visitor_phone: VARCHAR (20)
- service_id: UUID (Foreign Key)
- status: VARCHAR (50) - waiting/in_progress/completed/cancelled
- booking_type: VARCHAR (20) - online/offline
- queue_position: INTEGER - Posisi dalam antrian
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- completed_at: TIMESTAMP
- called_at: TIMESTAMP
```

### Queue History Table
```sql
- id: UUID (Primary Key)
- booking_id: UUID (Foreign Key)
- action: VARCHAR (50) - called/completed/skipped
- performed_by: VARCHAR (255)
- performed_at: TIMESTAMP
```

## Default 21 Layanan

1. Pendaftaran Perusahaan Baru
2. Perubahan Data Perusahaan
3. Permohonan Izin Usaha
4. Perpanjangan Izin Usaha
5. Penutupan Usaha
6. Sertifikat Domisili
7. Rekomendasi Lokasi Usaha
8. Perizinan Perdagangan
9. Perizinan Industri
10. Perizinan Lingkungan
11. Izin Prinsip
12. Izin Operasional
13. Persetujuan Investasi
14. Rekomendasi Tingkat Kabupaten
15. Rekomendasi Tingkat Provinsi
16. Surat Keterangan Usaha
17. Konsultasi Investasi
18. Pendaftaran Merek
19. Pengajuan Paten
20. Pembayaran Retribusi
21. Layanan Umum & Informasi

## Deployment

### Deploy ke Vercel (Recommended)

1. Push code ke GitHub repository
2. Buka https://vercel.com
3. Import project dari GitHub
4. Set environment variables di Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## Troubleshooting

### Masalah: "NEXT_PUBLIC_SUPABASE_URL is not set"
**Solusi:** Pastikan environment variables sudah ditambahkan di:
- `.env.local` untuk development
- Vercel Settings untuk production

### Masalah: Database query error
**Solusi:** 
1. Pastikan SQL migration sudah dijalankan
2. Cek Supabase dashboard untuk memastikan tabel ada
3. Pastikan RLS policies sudah diset dengan benar

### Masalah: QR Code tidak muncul
**Solusi:** Pastikan package `qrcode` sudah diinstall (`npm install qrcode`)

## Notes untuk Development

- Aplikasi menggunakan Next.js 16 dengan App Router
- Styling menggunakan Tailwind CSS v4
- Database menggunakan Supabase (PostgreSQL)
- Real-time updates menggunakan Supabase Realtime
- UI Components dari shadcn/ui

## File Structure

```
/
├── app/
│   ├── page.tsx                 # Halaman utama
│   ├── booking/                 # Halaman booking
│   ├── booking-confirmation/    # Halaman konfirmasi
│   ├── dashboard/               # Dashboard user
│   ├── admin/                   # Admin section
│   │   ├── login/               # Admin login
│   │   └── dashboard/           # Admin dashboard
│   ├── api/
│   │   └── admin/login/         # API login
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Supabase client
│   │   ├── server.ts            # Supabase server
│   │   └── proxy.ts             # Session proxy
│   └── utils.ts
├── components/
│   └── ui/                      # shadcn/ui components
├── scripts/
│   └── init-database.sql        # Database migration
└── middleware.ts                # Next.js middleware

```

## Support & Issues

Jika ada masalah, silakan check:
1. Vercel AI SDK documentation
2. Supabase documentation
3. Next.js documentation
4. v0 app examples

---

**Created for:** PKL Dinas Penanaman Modal dan Perizinan  
**Last Updated:** 2024
