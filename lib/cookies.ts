const COOKIE_NAME = 'user_bookings'
const COOKIE_EXPIRY_DAYS = 90 

export interface UserBooking {
  id: string
  booking_number: string
  created_at: string
  booking_date?: string 
  booking_time?: string
}

export function saveBookingToCookie(booking: UserBooking): void {
  try {
    const existing = getBookingsFromCookie();
    if (existing.some(b => b.id === booking.id)) return;

    const updated = [booking, ...existing].slice(0, 50);
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS);
    
    // Logic deteksi HTTPS/Production
    const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    // PAKAI LAX DAN SECURE (WAJIB BUAT HP)
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(updated))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isProd ? '; Secure' : ''}`;
    
    console.log("Cookie saved successfully!");
  } catch (error) {
    console.error('Error saving cookie:', error);
  }
}

export function getBookingsFromCookie(): UserBooking[] {
  try {
    if (typeof document === 'undefined') return [] 
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

export function removeBookingFromCookie(bookingId: string): void {
  try {
    const existing = getBookingsFromCookie()
    const filtered = existing.filter(b => b.id !== bookingId)
    const expires = new Date()
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(filtered))}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  } catch (error) {
    console.error('Error removing booking from cookie:', error)
  }
}