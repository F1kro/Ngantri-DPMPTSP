// lib/notifications.ts
// Browser Push Notification Utility dengan Fix Audio & Fallback TTS

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
 * Play sound notification - IMPROVED dengan fallback TTS
 */
export function playNotificationSound(message?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    // METHOD 1: Coba putar file MP3
    const audio = new Audio('/notif.mp3');
    
    // Set preload agar file di-cache penuh
    audio.preload = "auto";
    audio.volume = 0.9;
    
    // Force load file
    audio.load();
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ Audio notification played successfully');
        })
        .catch((err) => {
          console.warn('⚠️ Audio autoplay blocked or failed, using TTS fallback:', err);
          
          // FALLBACK METHOD 2: Gunakan Text-to-Speech (Robot Voice)
          playTTSNotification(message || "Nomor antrian Anda dipanggil. Silakan menuju loket.");
        });
    }
  } catch (error) {
    console.error('❌ Error playing notification sound:', error);
    
    // Fallback jika error
    playTTSNotification(message || "Nomor antrian Anda dipanggil");
  }
}

/**
 * Text-to-Speech Fallback (Robot Voice)
 */
function playTTSNotification(message: string): void {
  try {
    const synth = window.speechSynthesis;
    
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'id-ID';
    utterance.volume = 1;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    synth.speak(utterance);
    console.log('🔊 TTS notification played');
  } catch (error) {
    console.error('❌ TTS fallback failed:', error);
  }
}

/**
 * Notification khusus untuk nomor antrian dipanggil
 * IMPROVED: Dengan custom message untuk TTS
 */
export async function notifyQueueCalled(bookingNumber: string): Promise<void> {
  console.log(`🔔 Triggering notification for: ${bookingNumber}`);
  
  // 1. Kirim browser notification (popup)
  await sendNotification({
    title: '🔔 Nomor Antrian Anda Dipanggil!',
    body: `Nomor ${bookingNumber} - Silakan menuju loket pelayanan sekarang.`,
    tag: `queue-${bookingNumber}`,
    requireInteraction: true,
  })
  
  // 2. Putar suara dengan custom message untuk TTS fallback
  const ttsMessage = `Nomor antrean ${bookingNumber.split("").join(" ")}, silakan menuju loket pelayanan.`;
  playNotificationSound(ttsMessage);
}

/**
 * Notification untuk reminder antrian akan dipanggil
 */
export async function notifyQueueReminder(bookingNumber: string, queueLeft: number): Promise<void> {
  console.log(`⏰ Triggering reminder for: ${bookingNumber}, ${queueLeft} left`);
  
  await sendNotification({
    title: '⏰ Antrian Anda Hampir Tiba',
    body: `Nomor ${bookingNumber} - Tinggal ${queueLeft} antrian lagi. Bersiaplah!`,
    tag: `reminder-${bookingNumber}`,
    requireInteraction: false,
  })
  
  // Suara pelan untuk reminder (bisa dikosongkan jika tidak perlu suara)
  // playNotificationSound(`Antrian nomor ${bookingNumber}, tinggal ${queueLeft} lagi`);
}

/**
 * Preload audio file saat page load (untuk bypass autoplay policy)
 */
export function preloadNotificationAudio(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const audio = new Audio('/notif.mp3');
    audio.preload = "auto";
    audio.volume = 0; // Mute untuk preload
    audio.load();
    
    // Coba play muted untuk "unlock" audio context
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      console.log('✅ Audio preloaded and unlocked');
    }).catch(() => {
      console.log('ℹ️ Audio will unlock on first user interaction');
    });
  } catch (error) {
    console.warn('Audio preload failed:', error);
  }
}