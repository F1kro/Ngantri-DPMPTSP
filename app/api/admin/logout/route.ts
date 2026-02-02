// app/api/admin/logout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient()
    
    // Sign out dan hapus session
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        { error: 'Gagal logout' },
        { status: 500 }
      )
    }

    // Buat response dengan cookies yang di-clear
    const response = NextResponse.json(
      { message: 'Logout berhasil' },
      { status: 200 }
    )

    // Hapus semua auth cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    
    return response
    
  } catch (error) {
    console.error('Logout route error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    )
  }
}