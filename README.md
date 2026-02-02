# Sistem Antrian Dinas Penanaman Modal dan Perizinan

Aplikasi web untuk booking antrian online dengan sistem hybrid online-offline. Dibangun untuk memudahkan masyarakat dalam mengakses layanan dinas penanaman modal dan perizinan satu pintu.

## 🚀 Fitur Utama

### Untuk User (Publik)
- **Booking Antrian Online** - Form sederhana dengan input nama, telepon, dan pilihan layanan
- **Generate QR Code** - Setiap booking mendapatkan QR code yang bisa dicetak/disimpan
- **Real-time Queue Status** - Lihat posisi antrian, status, dan estimasi waktu
- **Dashboard Tracking** - Pantau antrian Anda kapan saja dengan search dan filter
- **Mobile Friendly** - Interface yang responsif dan mudah digunakan di semua device

### Untuk Admin
- **Manajemen Antrian Real-time** - Update status antrian secara langsung
- **CRUD Layanan** - Tambah, ubah, hapus layanan (support 21+ layanan)
- **Dashboard Statistik** - Lihat total antrian, sedang dilayani, dan sudah selesai
- **Integrasi Hybrid** - Kelola antrian online dan offline dalam satu sistem

## 📋 Persyaratan

- Node.js 18+
- Akun Supabase (gratis)
- Browser modern (Chrome, Firefox, Safari, Edge)

## ⚡ Quick Start

1. **Clone atau Download Project**
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **Setup Supabase**
   - Buat akun di https://supabase.com
   - Buat project baru
   - Salin `Project URL` dan `Anon Key`

3. **Setup Environment Variables**
   ```bash
   # Buat file .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Setup Database**
   - Buka SQL Editor di Supabase Dashboard
   - Copy-paste isi `/scripts/init-database.sql`
   - Jalankan SQL

5. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

Buka http://localhost:3000

## 📱 Pages & Routes

| Route | Deskripsi | Akses |
|-------|-----------|-------|
| `/` | Halaman utama | Public |
| `/booking` | Form booking antrian | Public |
| `/booking-confirmation/[id]` | Konfirmasi + QR Code | Public |
| `/dashboard` | Cek status antrian | Public |
| `/admin/login` | Login admin | Public |
| `/admin/dashboard` | Dashboard admin | Protected |

## 🔐 Admin Login (Demo)

```
Email: admin@dinas.go.id
Password: admin123
```

⚠️ **Ganti credentials untuk production!** Edit di `/app/api/admin/login/route.ts`

## 🎨 Design Highlights

- **Warna:** Blue/Indigo untuk user (modern), Dark Gray untuk admin (profesional)
- **Typography:** Clean dan readable untuk semua usia (boomer-friendly)
- **UX:** Simple form, clear status indicators, large buttons
- **Responsive:** Mobile, tablet, desktop optimized

## 🛠 Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Demo Admin
- **Real-time:** Supabase Realtime subscriptions
- **QR Code:** qrcode library
- **UI Components:** shadcn/ui (Radix UI + Tailwind)

## 📊 Database Schema

### Layanan (21 default)
```
- Pendaftaran Perusahaan Baru
- Perubahan Data Perusahaan
- Permohonan Izin Usaha
- ... (18 more)
```

### Tables
- `services` - Master data layanan
- `bookings` - Data antrian (online + offline)
- `queue_history` - Riwayat antrian

Lihat `/SETUP_GUIDE.md` untuk detail schema lengkap.

## 🔄 Alur Hybrid Online-Offline

```
User Web                    Admin Office              Database (Supabase)
   |                            |                           |
   +-- Book Antrian ---------> Supabase ---------> Store in DB
   |                            |                           |
   +-- Get QR Code           Real-time Update    Real-time Sync
   |                            |                           |
   +-- Check Status <------- Admin Updates ---------> Query DB
   |                            |                           |
   +-- See Position & Time      |                           |
                                |                           |
                        Update Status in Admin Panel         |
                                +--------> Update booking status
```

## 📦 Deployment

### Deploy ke Vercel (Recommended)

1. Push ke GitHub
2. Import project di Vercel
3. Set environment variables
4. Deploy!

```bash
npm run build
```

## 🐛 Troubleshooting

**Q: Form booking tidak submit?**
A: Pastikan environment variables sudah benar dan Supabase project aktif

**Q: Admin dashboard kosong?**
A: Cek apakah sudah login dengan credentials yang benar

**Q: QR Code tidak muncul?**
A: Clear browser cache dan refresh halaman

Lihat `/SETUP_GUIDE.md` untuk troubleshooting lengkap.

## 📞 Support

Dokumentasi lengkap: `/SETUP_GUIDE.md`

## 📝 License

Dibangun untuk PKL Dinas Penanaman Modal dan Perizinan 2024

---

**Dibuat dengan ❤️ menggunakan v0.app**
