// lib/notifications.ts
// Browser Push Notification Utility

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
  if (!('Notification' in window)) {
    console.warn('Browser tidak mendukung notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

/**
 * Kirim browser notification
 */
export async function sendNotification(options: NotificationOptions): Promise<void> {
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
      vibrate: [200, 100, 200], // Vibrate pattern (jika support)
    })

    // Auto close after 10 seconds (jika requireInteraction = false)
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000)
    }

    // Event handlers
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
  return 'Notification' in window
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Play sound notification
 */
export function playNotificationSound(): void {
  try {
    const audio = new Audio('/hidup-jokowi.mp3')
    audio.volume = 0.5
    audio.play().catch((err) => {
      console.warn('Could not play notification sound:', err)
    })
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}

/**
 * Notification khusus untuk nomor antrian dipanggil
 */
export async function notifyQueueCalled(bookingNumber: string): Promise<void> {
  await sendNotification({
    title: '🔔 Nomor Antrian Anda Dipanggil!',
    body: `Nomor ${bookingNumber} - Silakan menuju loket pelayanan sekarang.`,
    tag: `queue-${bookingNumber}`,
    requireInteraction: true, // User harus klik untuk dismiss
  })

  // Play sound
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
}