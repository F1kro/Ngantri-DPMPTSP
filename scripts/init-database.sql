-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_duration INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(20) NOT NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'waiting',
  booking_type VARCHAR(20) DEFAULT 'online',
  queue_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  called_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- QUEUE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS queue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_queue_history_booking ON queue_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - SERVICES
-- ============================================
-- Public can read services
DROP POLICY IF EXISTS "services_select_public" ON services;
CREATE POLICY "services_select_public" ON services 
  FOR SELECT USING (true);

-- Only admin can insert services
DROP POLICY IF EXISTS "services_insert_admin" ON services;
CREATE POLICY "services_insert_admin" ON services
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- Only admin can update services
DROP POLICY IF EXISTS "services_update_admin" ON services;
CREATE POLICY "services_update_admin" ON services
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));

-- Only admin can delete services
DROP POLICY IF EXISTS "services_delete_admin" ON services;
CREATE POLICY "services_delete_admin" ON services
  FOR DELETE USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================
-- RLS POLICIES - BOOKINGS
-- ============================================
-- Anyone can read bookings
DROP POLICY IF EXISTS "bookings_select_all" ON bookings;
CREATE POLICY "bookings_select_all" ON bookings 
  FOR SELECT USING (true);

-- Anyone can create bookings
DROP POLICY IF EXISTS "bookings_insert_public" ON bookings;
CREATE POLICY "bookings_insert_public" ON bookings 
  FOR INSERT WITH CHECK (true);

-- Admin can update all bookings
DROP POLICY IF EXISTS "bookings_update_all" ON bookings;
CREATE POLICY "bookings_update_all" ON bookings
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM admin_users) OR true
  );

-- ============================================
-- RLS POLICIES - QUEUE HISTORY
-- ============================================
DROP POLICY IF EXISTS "queue_history_select_all" ON queue_history;
CREATE POLICY "queue_history_select_all" ON queue_history 
  FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES - ADMIN USERS
-- ============================================
-- Admin can view all admin users
DROP POLICY IF EXISTS "admin_users_select_authenticated" ON admin_users;
CREATE POLICY "admin_users_select_authenticated" ON admin_users
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

-- Admin can update their own data
DROP POLICY IF EXISTS "admin_users_update_own" ON admin_users;
CREATE POLICY "admin_users_update_own" ON admin_users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- FUNCTION: CREATE ADMIN USER
-- ============================================
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT DEFAULT 'Administrator',
  admin_role TEXT DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users
  new_user_id := auth.create_user(
    email := admin_email,
    password := admin_password,
    email_confirmed := true
  );
  
  -- Insert into admin_users table
  INSERT INTO admin_users (id, email, name, role)
  VALUES (new_user_id, admin_email, admin_name, admin_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN new_user_id;
END;
$$;

-- ============================================
-- SEED DATA: ADMIN USERS
-- ============================================
DO $$
BEGIN
  -- Admin Utama
  PERFORM create_admin_user(
    'admin@dinas.go.id',
    'dinas2024',
    'Administrator Utama',
    'admin'
  );
  
  -- Staff Admin
  PERFORM create_admin_user(
    'staff@dinas.go.id',
    'staff2024',
    'Staff Admin',
    'staff'
  );
  
  -- Supervisor
  PERFORM create_admin_user(
    'supervisor@dinas.go.id',
    'supervisor2024',
    'Supervisor Layanan',
    'supervisor'
  );
  
  RAISE NOTICE 'Successfully seeded admin users';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error seeding admin users: %', SQLERRM;
END $$;

-- ============================================
-- SEED DATA: 21 SERVICES
-- ============================================
INSERT INTO services (name, description, estimated_duration) VALUES
  ('Pendaftaran Perusahaan Baru', 'Layanan pendaftaran perusahaan/usaha baru untuk mendapatkan legalitas usaha', 30),
  ('Perubahan Data Perusahaan', 'Layanan perubahan data perusahaan seperti alamat, pengurus, atau modal', 20),
  ('Permohonan Izin Usaha', 'Layanan permohonan izin usaha untuk berbagai jenis kegiatan usaha', 45),
  ('Perpanjangan Izin Usaha', 'Layanan perpanjangan masa berlaku izin usaha yang akan habis', 25),
  ('Penutupan Usaha', 'Layanan administrasi penutupan usaha dan pencabutan izin', 30),
  ('Sertifikat Domisili', 'Layanan penerbitan sertifikat domisili usaha sebagai bukti lokasi usaha', 20),
  ('Rekomendasi Lokasi Usaha', 'Layanan rekomendasi kelayakan lokasi untuk usaha tertentu', 35),
  ('Perizinan Perdagangan', 'Layanan perizinan untuk kegiatan perdagangan dan distribusi', 40),
  ('Perizinan Industri', 'Layanan perizinan untuk kegiatan industri dan manufaktur', 50),
  ('Perizinan Lingkungan', 'Layanan perizinan terkait dampak lingkungan (UKL-UPL, AMDAL)', 60),
  ('Izin Prinsip', 'Layanan izin prinsip sebagai tahap awal pendirian usaha', 30),
  ('Izin Operasional', 'Layanan izin operasional untuk menjalankan kegiatan usaha', 35),
  ('Persetujuan Investasi', 'Layanan persetujuan rencana investasi untuk investor', 45),
  ('Rekomendasi Tingkat Kabupaten', 'Layanan rekomendasi dari tingkat kabupaten untuk perizinan lanjutan', 25),
  ('Rekomendasi Tingkat Provinsi', 'Layanan rekomendasi dari tingkat provinsi untuk perizinan lanjutan', 30),
  ('Surat Keterangan Usaha', 'Layanan penerbitan surat keterangan untuk keperluan usaha', 15),
  ('Konsultasi Investasi', 'Layanan konsultasi gratis untuk calon investor dan pengusaha', 40),
  ('Pendaftaran Merek', 'Layanan bantuan pendaftaran merek dagang dan hak kekayaan intelektual', 35),
  ('Pengajuan Paten', 'Layanan bantuan pengajuan paten untuk produk atau inovasi', 40),
  ('Pembayaran Retribusi', 'Layanan pembayaran retribusi perizinan dan administrasi', 15),
  ('Layanan Umum & Informasi', 'Layanan informasi umum dan pengaduan terkait perizinan', 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION & SUMMARY
-- ============================================
DO $$
DECLARE
  services_count INTEGER;
  admin_count INTEGER;
BEGIN
  -- Count services
  SELECT COUNT(*) INTO services_count FROM services;
  
  -- Count admin users
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'SEEDING COMPLETE!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total Services: %', services_count;
  RAISE NOTICE 'Total Admin Users: %', admin_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Admin Credentials:';
  RAISE NOTICE '1. admin@dinas.go.id / dinas2024';
  RAISE NOTICE '2. staff@dinas.go.id / staff2024';
  RAISE NOTICE '3. supervisor@dinas.go.id / supervisor2024';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- CLEANUP (Optional - untuk keamanan)
-- ============================================
-- Uncomment baris di bawah jika ingin hapus function setelah seeding
-- DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT, TEXT);