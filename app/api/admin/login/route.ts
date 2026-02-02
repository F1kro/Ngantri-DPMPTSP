// app/api/admin/login/route.ts
import { createClient } from '@/lib/supabase/server' 
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Pastikan createClient() di sini sudah dikonfigurasi untuk membaca/menulis cookies
    const supabase = createClient()

    // 1. Validasi Autentikasi
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Email atau password salah' }, 
        { status: 401 }
      )
    }

    // 2. Verifikasi Role (Otorisasi)
    // Kita cek apakah ID user ini ada di tabel admin_users
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_users')
      .select('role, name')
      .eq('id', authData.user.id)
      .single()

    // Jika user terdaftar di Auth tapi tidak ada di tabel admin_users
    if (profileError || !adminProfile) {
      // Logout kembali karena dia bukan admin
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses administrator' }, 
        { status: 403 }
      )
    }

    // 3. Sukses
    return NextResponse.json({
      message: 'Login berhasil',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: adminProfile.name,
        role: adminProfile.role
      }
    })

  } catch (error) {
    console.error('Login Route Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}