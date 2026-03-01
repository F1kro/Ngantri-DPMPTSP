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
    // Ambil data lama
    const existing = getBookingsFromCookie();
    
    // Filter agar tidak ada ID ganda (Duplikasi)
    const filteredExisting = existing.filter(b => b.id !== booking.id);

    // Tambahkan data baru di posisi paling atas (Limit 50 riwayat terakhir)
    const updated = [booking, ...filteredExisting].slice(0, 50);
    
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS);
    
    const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    // Gunakan encodeURIComponent untuk keamanan karakter JSON
    const cookieValue = encodeURIComponent(JSON.stringify(updated));
    
    // Set Cookie dengan atribut yang kompatibel dengan banyak Browser Mobile
    document.cookie = `${COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isProd ? '; Secure' : ''}`;
    
    console.log("Riwayat antrean berhasil disimpan ke storage lokal.");
  } catch (error) {
    console.error('Error saving cookie:', error);
  }
}

export function getBookingsFromCookie(): UserBooking[] {
  try {
    if (typeof document === 'undefined') return [] 
    
    const cookieString = document.cookie;
    const parts = cookieString.split(';');
    const cookieNameWithEqual = `${COOKIE_NAME}=`;
    
    for (let part of parts) {
      part = part.trim();
      if (part.indexOf(cookieNameWithEqual) === 0) {
        const value = part.substring(cookieNameWithEqual.length);
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
    return []
  } catch (error) {
    console.error('Error reading bookings from cookie:', error)
    return []
  }
}

export function removeBookingFromCookie(bookingId: string): void {
  try {
    const existing = getBookingsFromCookie();
    const filtered = existing.filter(b => b.id !== bookingId);
    
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS);
    
    const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(filtered))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isProd ? '; Secure' : ''}`;
  } catch (error) {
    console.error('Error removing booking from cookie:', error)
  }
}