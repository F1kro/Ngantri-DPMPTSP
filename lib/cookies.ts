// lib/cookies.ts
// Utility untuk manage booking IDs di cookie

const COOKIE_NAME = 'user_bookings'
const COOKIE_EXPIRY_DAYS = 90 // Cookie expire dalam 90 hari

export interface UserBooking {
  id: string
  booking_number: string
  created_at: string
}

/**
 * Simpan booking ID ke cookie
 */
export function saveBookingToCookie(booking: UserBooking): void {
  try {
    const existing = getBookingsFromCookie()
    
    // Cek apakah booking sudah ada (prevent duplicate)
    const isDuplicate = existing.some(b => b.id === booking.id)
    if (isDuplicate) return

    // Tambah booking baru di awal array
    const updated = [booking, ...existing]
    
    // Limit hanya simpan 50 booking terakhir
    const limited = updated.slice(0, 50)
    
    // Simpan ke cookie
    const expires = new Date()
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)
    
    document.cookie = `${COOKIE_NAME}=${JSON.stringify(limited)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  } catch (error) {
    console.error('Error saving booking to cookie:', error)
  }
}

/**
 * Ambil semua booking IDs dari cookie
 */
export function getBookingsFromCookie(): UserBooking[] {
  try {
    if (typeof document === 'undefined') return [] // Server-side safety
    
    const cookies = document.cookie.split(';')
    const bookingCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
    
    if (!bookingCookie) return []
    
    const value = bookingCookie.split('=')[1]
    return JSON.parse(decodeURIComponent(value))
  } catch (error) {
    console.error('Error reading bookings from cookie:', error)
    return []
  }
}

/**
 * Hapus booking tertentu dari cookie (setelah cancel)
 */
export function removeBookingFromCookie(bookingId: string): void {
  try {
    const existing = getBookingsFromCookie()
    const filtered = existing.filter(b => b.id !== bookingId)
    
    const expires = new Date()
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)
    
    document.cookie = `${COOKIE_NAME}=${JSON.stringify(filtered)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  } catch (error) {
    console.error('Error removing booking from cookie:', error)
  }
}

/**
 * Clear semua bookings dari cookie
 */
export function clearAllBookings(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Cek apakah user punya booking aktif
 */
export function hasActiveBookings(): boolean {
  return getBookingsFromCookie().length > 0
}