import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phone, message } = await req.json();
    const token = process.env.FONNTE_TOKEN || "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "FONNTE token belum dikonfigurasi" },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: new URLSearchParams({
        target: phone,
        message: message,
      }),
    });

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat kirim notifikasi WA";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
