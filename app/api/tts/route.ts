// app/api/tts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

// Voice yang tersedia:
// id-ID-GadisNeural  → wanita (untuk user monitor)
// id-ID-ArdiNeural   → pria   (untuk admin panel)
const ALLOWED_VOICES = ['id-ID-GadisNeural', 'id-ID-ArdiNeural'];
const DEFAULT_VOICE = 'id-ID-GadisNeural';

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text');
  const voiceParam = req.nextUrl.searchParams.get('voice') || DEFAULT_VOICE;

  if (!text) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  // Validasi voice agar tidak bisa diinjeksi sembarang value
  const voice = ALLOWED_VOICES.includes(voiceParam) ? voiceParam : DEFAULT_VOICE;

  try {
    const communicate = new Communicate(text, {
      voice,
      rate: '-10%',
      volume: '+0%',
      pitch: '+0Hz',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        chunks.push(chunk.data);
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
    }

    return new NextResponse(Buffer.concat(chunks), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}