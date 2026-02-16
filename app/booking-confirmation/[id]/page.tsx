'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CheckCircle2, Monitor, Clock, Download, Calendar } from 'lucide-react'

interface BookingDetail {
  id: string
  booking_number: string
  visitor_name: string
  visitor_phone: string
  service_id: string
  queue_position: number
  status: string
  created_at: string
  booking_date: string 
  booking_time: string 
  service?: {
    name: string
    estimated_duration: number
  }
}

export default function BookingConfirmationPage() {
  const params = useParams()
  const bookingId = params.id as string
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrGenerated, setQrGenerated] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  const generateQRCode = async (serviceId: string) => {
    if (qrRef.current && !qrGenerated) {
      try {
        const monitorUrl = `${window.location.origin}/monitor?service=${serviceId}`
        await QRCode.toCanvas(qrRef.current, monitorUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#4f46e5', light: '#ffffff' },
        })
        setQrGenerated(true)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }
  }

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, booking_number, visitor_name, visitor_phone, service_id,
            queue_position, status, created_at, booking_date, booking_time,
            services:service_id (name, estimated_duration)
          `)
          .eq('id', bookingId)
          .single()

        if (error) throw error
        setBooking({ ...data, service: data.services })
      } catch (err) {
        console.error('Error fetching booking:', err)
      } finally {
        setLoading(false)
      }
    }

    if (bookingId) fetchBooking()
  }, [bookingId])

  useEffect(() => {
    if (booking?.service_id && qrRef.current) {
      generateQRCode(booking.service_id)
    }
  }, [booking, qrGenerated])

  const handleDownloadQR = () => {
    if (!qrRef.current) return
    const canvas = qrRef.current
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `QR-Antrean-${booking?.booking_number}.png`
    link.href = url
    link.click()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Menyiapkan Tiket...</p>
      </div>
    </main>
  )

  if (!booking) return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
       <Card className="bg-slate-900 border-slate-800 text-white rounded-[2rem] p-6 text-center">
          <p className="text-red-400 font-bold mb-4">Antrean tidak ditemukan.</p>
          <Link href="/booking"><Button className="bg-indigo-600">Booking Ulang</Button></Link>
       </Card>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans pb-20">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <CheckCircle2 className="h-14 w-14 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Booking Berhasil!</h1>
        </div>

        <Card className="bg-slate-900/50 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 md:p-8 space-y-8">
            
            <div className="flex flex-col items-center gap-6 p-6 md:p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl shadow-indigo-600/20 text-center">
              <div>
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Nomor Antrean</p>
                <h2 className="text-5xl md:text-7xl font-black text-white font-mono tracking-tighter">{booking.booking_number}</h2>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full border border-white/20">
                  <Clock size={16} className="text-white" />
                  <span className="text-xl font-black text-white uppercase">{booking.booking_time} WITA</span>
                </div>
                <p className="text-[10px] font-bold text-indigo-100 mt-2 uppercase tracking-widest">
                  {formatDate(booking.booking_date)}
                </p>
              </div>
              
              <div className="bg-white p-3 rounded-2xl shadow-2xl border-4 border-indigo-400/20 w-full max-w-[220px] flex items-center justify-center">
                <canvas 
                  ref={qrRef} 
                  className="w-full h-auto"
                  style={{ maxWidth: '200px', aspectRatio: '1/1' }}
                />
              </div>
              
              <Button 
                onClick={handleDownloadQR} 
                variant="secondary" 
                className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl font-bold uppercase text-[10px] gap-2 w-full max-w-xs"
              >
                 <Download size={14}/> Unduh QR Code
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Calendar size={12}/> Tanggal</p>
                <p className="text-sm font-bold text-white uppercase">{formatDate(booking.booking_date)}</p>
              </div>
              <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Clock size={12}/> Jam Kedatangan</p>
                <p className="text-sm font-bold text-indigo-400 uppercase">{booking.booking_time} WITA</p>
              </div>
              <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase">Nama Pengunjung</p>
                <p className="text-sm font-bold text-white uppercase break-words">{booking.visitor_name}</p>
              </div>
              <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase">Layanan</p>
                <p className="text-sm font-bold text-indigo-400 uppercase break-words">{booking.service?.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="print:hidden">
          <Link href="/" className="w-full block">
            <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl gap-3 uppercase text-[10px] shadow-xl">
              <Monitor size={18}/> Kembali ke Beranda
            </Button>
          </Link>
        </div>

        <div className="p-6 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl text-center">
           <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">PENTING</p>
           <p className="text-[10px] md:text-xs font-medium text-slate-500 italic px-2">
             Mohon hadir 5 menit sebelum jadwal <b>{booking.booking_time}</b>. Tunjukkan tiket ini kepada petugas.
           </p>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </main>
  )
}