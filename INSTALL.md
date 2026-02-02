# Panduan Instalasi Lengkap

## Step 1: Siapkan Supabase (5 menit)

### Buat Project Supabase
1. Kunjungi https://supabase.com
2. Login atau buat akun baru
3. Klik "New project"
4. Isi detail:
   - **Project name:** antrian-dinas
   - **Database password:** (simpan password ini!)
   - **Region:** Indonesia (asia-southeast1) atau terdekat
5. Klik "Create new project" dan tunggu ~2 menit

### Ambil API Keys
1. Setelah project dibuat, buka **Settings** (gear icon)
2. Pilih **API** di sidebar
3. Copy nilai ini:
   - **Project URL** (di bawah "URL")
   - **anon public** (di bawah "Project API keys")

## Step 2: Setup Project Lokal (5 menit)

### A. Download/Clone Project
```bash
# Jika sudah di folder project, skip ke B
cd path/to/project
```

### B. Buat File .env.local
Di root folder project, buat file bernama `.env.local` dan isi:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Ganti dengan nilai yang Anda copy dari Step 1.

**Contoh:**
```
NEXT_PUBLIC_SUPABASE_URL=https://kbjmruqslmvpqwxtz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### C. Install Dependencies
```bash
npm install
```

## Step 3: Setup Database (3 menit)

### Jalankan SQL Migration
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Klik **SQL Editor** (di sidebar kiri, icon </>)
4. Klik **New query**
5. Copy seluruh isi file `/scripts/init-database.sql`
6. Paste ke SQL Editor
7. Klik **Run** (atau tekan Ctrl+Enter)
8. Tunggu sampai selesai ✓

**Jika berhasil, Anda akan melihat:**
- 3 table baru di Supabase: `services`, `bookings`, `queue_history`
- 21 layanan sudah terisi otomatis

## Step 4: Run Application (2 menit)

### Development Mode
```bash
npm run dev
```

Output akan seperti:
```
  ▲ Next.js 16.0.10
  - Local:        http://localhost:3000
```

### Buka Browser
1. Kunjungi http://localhost:3000
2. Anda akan melihat halaman utama dengan 3 opsi:
   - Daftar Antrian
   - Cek Antrian
   - Login Admin

**Selesai! Aplikasi siap digunakan.**

---

## Testing

### Test User Flow
1. Klik "Daftar Antrian"
2. Isi form dengan data dummy:
   - Nama: John Doe
   - Telepon: 081234567890
   - Layanan: Pilih salah satu
3. Klik "Daftar Antrian"
4. Lihat QR Code yang generated
5. Kembali, klik "Cek Status" untuk melihat antrian Anda

### Test Admin Flow
1. Klik "Login Admin"
2. Gunakan:
   - Email: admin@dinas.go.id
   - Password: dinas2024
3. Di dashboard admin:
   - Tab "Manajemen Antrian" - lihat dan update status
   - Tab "Manajemen Layanan" - tambah/edit/hapus layanan

---

## Troubleshooting

### Error: "Cannot find module '@supabase/ssr'"
```bash
npm install
```

### Error: "NEXT_PUBLIC_SUPABASE_URL is not set"
- Pastikan file `.env.local` ada di root project
- Pastikan isi `.env.local` benar (copy-paste exact dari Supabase)
- Restart server: stop `npm run dev` dan jalankan lagi

### Error: Database query failed
- Pastikan SQL migration sudah dijalankan tanpa error
- Di Supabase Dashboard, buka **Tables** dan cek apakah tabel ada
- Pastikan RLS policies benar (lihat di **Tables > bookings > RLS**)

### Error: Login admin tidak bekerja
- Pastikan email & password exact: `admin@dinas.go.id` / `dinas2024`
- Clear browser cache (Ctrl+Shift+Delete)
- Cek browser console (F12) untuk error detail

### Page blank/tidak muncul
- Refresh halaman (F5)
- Clear cache (Ctrl+Shift+Delete)
- Buka browser DevTools (F12) dan check Console tab untuk error
- Pastikan `.env.local` benar dan server sudah restart

---

## Deployment (Optional)

Setelah sudah jalan lokal dan berfungsi baik, Anda bisa deploy ke Vercel:

### Deploy ke Vercel
1. Push code ke GitHub
2. Buka https://vercel.com
3. Login dengan GitHub
4. Klik "Add New... > Project"
5. Select repository
6. Di Settings, tambah environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Deploy!

---

## File Penting

- `/README.md` - Overview aplikasi
- `/SETUP_GUIDE.md` - Setup dan troubleshooting lengkap
- `/scripts/init-database.sql` - Database migration
- `/.env.local` - Environment variables (jangan commit ke git!)
- `/app/page.tsx` - Halaman utama
- `/app/admin/dashboard/page.tsx` - Admin dashboard

---

## Next Steps

1. **Customize:** Ganti warna, logo, nama dinas di code
2. **Production:** Ganti admin credentials di `/app/api/admin/login/route.ts`
3. **Deploy:** Follow "Deployment" section di atas
4. **Monitoring:** Check Supabase Dashboard untuk melihat data & logs

---

Jika ada masalah di step mana pun, silakan check `/SETUP_GUIDE.md` untuk info lebih detail!

**Happy Coding!**
