'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveBookingToCookie } from '@/lib/cookies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Send, Loader2, Sparkles, User, Phone, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function BookingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', serviceId: '' })

  useEffect(() => {
    supabase.from('services').select('*').order('name').then(({ data }) => setServices(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.serviceId) return toast.error("Silakan pilih jenis layanan")
    setLoading(true)
    
    try {
      const count = await supabase.from('bookings').select('id', { count: 'exact' })
      const num = (count.count || 0) + 1
      const booking_number = `A-${String(num).padStart(3, '0')}`

      const { data, error } = await supabase.from('bookings').insert([{
        booking_number,
        visitor_name: formData.name,
        visitor_phone: formData.phone,
        service_id: formData.serviceId,
        status: 'waiting',
        queue_position: num
      }]).select()

      if (error) throw error

      if (data && data[0]) {
        saveBookingToCookie({
          id: data[0].id,
          booking_number: data[0].booking_number,
          created_at: data[0].created_at
        })

        toast.success('Booking berhasil!')
        router.push(`/booking-confirmation/${data[0].id}`)
      }
    } catch (error) {
      console.error('Booking error:', error)
      toast.error('Gagal membuat booking. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // FIX: Tambahkan overflow-hidden di main untuk kunci layar
    <main className="relative h-screen w-full bg-[#020617] text-slate-100 overflow-hidden flex flex-col items-center">
      
      {/* BACKGROUND DECOR - FIX: Dibungkus div pointer-events-none agar tidak ganggu klik */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>
      
      {/* SCROLLABLE CONTAINER */}
      <div className="w-full max-w-xl z-10 p-4 md:p-8 overflow-y-auto no-scrollbar flex flex-col gap-6 md:gap-8">
        
        {/* HEADER & NAV */}
        <header className="flex items-center justify-between bg-slate-900/60 p-3 md:p-4 rounded-3xl border border-slate-800 backdrop-blur-md shrink-0 shadow-xl">
          <div className="flex items-center gap-3 ml-1">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm md:text-lg font-black uppercase tracking-tight leading-none">Ambil Antrean</h1>
              <p className="text-[7px] md:text-[9px] text-slate-500 font-black uppercase tracking-[0.15em] mt-1">Lombok Barat</p>
            </div>
          </div>

          <Link href="/">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 md:h-11 rounded-2xl gap-2 bg-slate-800/50 border-slate-700 text-indigo-400 font-black text-[9px] md:text-xs uppercase px-4 shadow-lg shadow-indigo-500/5 active:scale-95 transition-all border-b-4 border-b-indigo-900/50"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Kembali ke Dashboard</span>
              <span className="sm:hidden text-[8px]">Dashboard</span>
            </Button>
          </Link>
        </header>

        {/* FORM SECTION */}
        <div className="space-y-6 pb-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Formulir Booking</h2>
            <p className="text-slate-400 text-[11px] md:text-sm font-medium italic px-4">
              Silakan isi data dengan benar untuk mendapatkan nomor antrean.
            </p>
          </div>

          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden border-2">
            <CardContent className="p-6 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User size={12} /> Nama Lengkap
                  </Label>
                  <Input 
                    placeholder="Contoh: Budi Santoso" 
                    className="h-12 md:h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone size={12} /> WhatsApp
                  </Label>
                  <Input 
                    type="tel" 
                    placeholder="08123456789" 
                    className="h-12 md:h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white focus:ring-1 focus:ring-indigo-500 font-bold text-sm"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Briefcase size={12} /> Layanan
                  </Label>
                  <Select onValueChange={val => setFormData({...formData, serviceId: val})}>
                    <SelectTrigger className="h-12 md:h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white font-bold text-sm">
                      <SelectValue placeholder="Pilih Layanan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-2xl max-h-[300px]">
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id} className="py-3 font-bold text-xs focus:bg-indigo-600 rounded-xl">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  disabled={loading}
                  className="w-full h-14 md:h-16 bg-indigo-600 hover:bg-indigo-500 text-white text-sm md:text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl mt-2 active:scale-95 transition-all border-b-4 border-b-indigo-800"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <div className="flex items-center gap-3">
                      DAFTAR SEKARANG <Send size={18} />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}