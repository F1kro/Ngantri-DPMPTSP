// lib/notifications.ts

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

export type TTSVoice = 'id-ID-GadisNeural' | 'id-ID-ArdiNeural';

// Default: wanita (user monitor)
export const VOICE_FEMALE: TTSVoice = 'id-ID-GadisNeural';
// Admin panel
export const VOICE_MALE: TTSVoice = 'id-ID-ArdiNeural';

let currentAudio: HTMLAudioElement | null = null;

const MEDIA_ERROR_CODES: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
};

export async function playTTSNotification(
  message: string,
  voice: TTSVoice = VOICE_FEMALE  // default wanita, admin pass VOICE_MALE
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }

    const url = `/api/tts?text=${encodeURIComponent(message)}&voice=${voice}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error('TTS API error:', await res.json().catch(() => ({})));
      return;
    }

    const blob = await res.blob();
    if (blob.size === 0 || !blob.type.startsWith('audio')) {
      console.warn('TTS: blob tidak valid, size:', blob.size);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    currentAudio = audio;

    audio.onended = () => { URL.revokeObjectURL(objectUrl); currentAudio = null; };
    audio.onerror = () => {
      const mediaErr = audio.error;
      if (mediaErr) {
        if (mediaErr.code === 1) return; // aborted = normal
        console.error(`Audio error: ${MEDIA_ERROR_CODES[mediaErr.code] || mediaErr.code}`, mediaErr.message || '');
      }
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
    };

    await audio.play();
  } catch (err) {
    console.error('TTS Exception:', err);
  }
}

export function unlockTTS(): void {}
export function isTTSUnlocked(): boolean { return true; }
export function initTTSVoices(): void {}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export async function sendNotification(options: NotificationOptions): Promise<void> {
  if (typeof window === 'undefined') return;
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;
  try {
    const n = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon.png',
      badge: options.badge || '/icon.png',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    console.error('Notification error:', err);
  }
}

// User monitor — suara wanita (default)
export async function notifyQueueCalled(bookingNumber: string): Promise<void> {
  await sendNotification({
    title: '🔔 Giliran Anda!',
    body: `Nomor Antrean ${bookingNumber} - Silakan menuju loket sekarang.`,
    tag: `queue-${bookingNumber}`,
    requireInteraction: true,
  });
  await playTTSNotification(
    `Nomor antrean ${bookingNumber}, silakan menuju loket pelayanan.`,
    VOICE_FEMALE
  );
}

export async function notifyQueueReminder(bookingNumber: string, queueLeft: number): Promise<void> {
  await sendNotification({
    title: '⏰ Antrean Hampir Tiba',
    body: `Nomor ${bookingNumber} - Sisa ${queueLeft} orang lagi.`,
    tag: `reminder-${bookingNumber}`,
  });
  await playTTSNotification(
    `Antrean nomor ${bookingNumber}, sisa ${queueLeft} orang lagi. Bersiaplah.`,
    VOICE_FEMALE
  );
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}