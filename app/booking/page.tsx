'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Landmark, ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

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
    setLoading(true)
    
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

    if (!error && data) router.push(`/booking-confirmation/${data[0].id}`)
    setLoading(false)
  }

  return (
    <main className="relative min-h-screen w-full bg-[#0f172a] flex flex-col items-center p-4 overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
      
      <div className="w-full max-w-[500px] z-10 pt-8 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 font-semibold">
          <ArrowLeft size={18} /> Kembali
        </Link>

        <div className="mb-10 space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
            Daftar Antrean <Sparkles className="text-indigo-400" />
          </h1>
          <p className="text-slate-400">Silakan lengkapi data perizinan Anda</p>
        </div>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</Label>
                <Input 
                  placeholder="Nama sesuai identitas" 
                  className="h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white focus:border-indigo-500/50"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp / Telepon</Label>
                <Input 
                  type="tel" 
                  placeholder="0812xxxx" 
                  className="h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white focus:border-indigo-500/50"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Jenis Layanan</Label>
                <Select onValueChange={val => setFormData({...formData, serviceId: val})}>
                  <SelectTrigger className="h-14 bg-slate-950/50 border-slate-800 rounded-2xl text-white">
                    <SelectValue placeholder="Pilih Layanan..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id} className="py-3 focus:bg-indigo-600">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                disabled={loading}
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-500/20 mt-4 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Daftar Sekarang <Send size={18} className="ml-2" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}