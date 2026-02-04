// lib/notifications.ts
// Browser Push Notification Utility dengan Fix Audio Status 206

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

/**
 * Request notification permission dari user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Browser tidak mendukung notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Kirim browser notification
 */
export async function sendNotification(options: NotificationOptions): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    console.warn('User belum memberikan permission untuk notifications')
    return
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/notification-icon.png',
      badge: options.badge || '/badge-icon.png',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
    })

    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000)
    }

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Cek apakah browser support notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Play sound notification - FIX UNTUK STATUS 206 & MOBILE
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    // Gunakan path file yang konsisten
    const audio = new Audio('/hidup-jokowi.mp3');
    
    // SOLUSI STATUS 206: Paksa browser untuk pre-load file audio sepenuhnya
    audio.load(); 
    audio.volume = 0.8;
    audio.preload = "auto";

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay diblokir browser atau Partial Content 206 error:', err);
        
        // FALLBACK: Gunakan Speech Synthesis (Suara Robot) jika file audio gagal diputar
        // Ini memastikan user tetap dengar suara walaupun file MP3 error
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance("Nomor antrean Anda dipanggil");
        utter.lang = 'id-ID';
        utter.volume = 1;
        synth.speak(utter);
      });
    }
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}

/**
 * Notification khusus untuk nomor antrian dipanggil
 */
export async function notifyQueueCalled(bookingNumber: string): Promise<void> {
  // Kirim notifikasi teks dulu
  await sendNotification({
    title: '🔔 Nomor Antrian Anda Dipanggil!',
    body: `Nomor ${bookingNumber} - Silakan menuju loket pelayanan sekarang.`,
    tag: `queue-${bookingNumber}`,
    requireInteraction: true,
  })

  // Baru putar suara
  playNotificationSound()
}

/**
 * Notification untuk reminder antrian akan dipanggil
 */
export async function notifyQueueReminder(bookingNumber: string, queueLeft: number): Promise<void> {
  await sendNotification({
    title: '⏰ Antrian Anda Hampir Tiba',
    body: `Nomor ${bookingNumber} - Tinggal ${queueLeft} antrian lagi. Bersiaplah!`,
    tag: `reminder-${bookingNumber}`,
    requireInteraction: false,
  })
  
  // Opsional: Bunyikan suara pelan untuk reminder
  playNotificationSound()
}