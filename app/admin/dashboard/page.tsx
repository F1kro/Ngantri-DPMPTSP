'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/admin/sidebar'
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type BookingStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled'

interface Booking {
  id: string
  created_at: string
  status: BookingStatus
  service_id: string
  services: {
    name: string
    estimated_duration: number
  }
}

interface ServiceStats {
  service_name: string
  total_bookings: number
  avg_duration: number
  completed: number
  cancelled: number
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<any[]>([])
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  
  // Pagination untuk tabel performa layanan
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    const [bookingsRes, servicesRes] = await Promise.all([
      supabase.from('bookings').select('*, services(name, estimated_duration)').order('created_at', { ascending: false }),
      supabase.from('services').select('*')
    ])
    setBookings(bookingsRes.data || [])
    setServices(servicesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    
    // Real-time subscription
    const channel = supabase
      .channel('bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter berdasarkan periode
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.created_at)
    const now = new Date()
    
    if (period === 'today') {
      return bookingDate.toDateString() === now.toDateString()
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      return bookingDate >= weekAgo
    } else if (period === 'month') {
      return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
    }
    return true
  })

  // Reset pagination saat period berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [period])

  // Statistik Umum
  const totalBookings = filteredBookings.length
  const completedBookings = filteredBookings.filter(b => b.status === 'completed').length
  const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length
  const waitingBookings = filteredBookings.filter(b => b.status === 'waiting').length
  const inProgressBookings = filteredBookings.filter(b => b.status === 'in_progress').length

  // Completion Rate
  const completionRate = totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0'

  // Rata-rata waktu pelayanan per service
  const serviceStats: ServiceStats[] = services.map(service => {
    const serviceBookings = filteredBookings.filter(b => b.service_id === service.id)
    const completedServiceBookings = serviceBookings.filter(b => b.status === 'completed')
    
    return {
      service_name: service.name,
      total_bookings: serviceBookings.length,
      avg_duration: service.estimated_duration,
      completed: completedServiceBookings.length,
      cancelled: serviceBookings.filter(b => b.status === 'cancelled').length,
    }
  }).sort((a, b) => b.total_bookings - a.total_bookings)

  // Top 5 layanan terpopuler
  const topServices = serviceStats.slice(0, 5)
  const maxBookings = Math.max(...topServices.map(s => s.total_bookings), 1)

  // Pagination untuk tabel performa layanan
  const totalPages = Math.ceil(serviceStats.length / itemsPerPage)
  const paginatedServiceStats = serviceStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Distribusi status
  const statusDistribution = [
    { label: 'Menunggu', value: waitingBookings, color: 'bg-amber-500', textColor: 'text-amber-400' },
    { label: 'Sedang Dilayani', value: inProgressBookings, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
    { label: 'Selesai', value: completedBookings, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { label: 'Dibatalkan', value: cancelledBookings, color: 'bg-red-500', textColor: 'text-red-400' },
  ]

  const getPeriodLabel = () => {
    switch(period) {
      case 'today': return 'Hari Ini'
      case 'week': return 'Minggu Ini'
      case 'month': return 'Bulan Ini'
      default: return 'Hari Ini'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-indigo-400" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Memuat Dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {/* HEADER */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Dashboard Analitik</h2>
              <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.2em]">
                Monitoring & Statistik Real-Time
              </p>
            </div>

            {/* Filter Periode */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Periode:</span>
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger className="w-[160px] h-10 bg-slate-950/50 border-slate-800 text-white rounded-xl font-bold uppercase text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>

          {/* STATISTIK CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Antrean */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 p-6 rounded-3xl">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                  <Users className="text-indigo-400" size={24} />
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[8px] font-black">
                  {getPeriodLabel()}
                </Badge>
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Antrean</h3>
              <p className="text-4xl font-black text-white mb-1">{totalBookings}</p>
              <p className="text-[10px] text-indigo-400 font-bold">Pengunjung terdaftar</p>
            </Card>

            {/* Selesai */}
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 p-6 rounded-3xl">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <CheckCircle2 className="text-emerald-400" size={24} />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8px] font-black">
                  {completionRate}%
                </Badge>
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selesai Dilayani</h3>
              <p className="text-4xl font-black text-white mb-1">{completedBookings}</p>
              <p className="text-[10px] text-emerald-400 font-bold">Completion rate tinggi</p>
            </Card>

            {/* Sedang Proses */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 p-6 rounded-3xl">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-amber-500/20 rounded-2xl">
                  <Clock className="text-amber-400" size={24} />
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[8px] font-black animate-pulse">
                  LIVE
                </Badge>
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Aktif Sekarang</h3>
              <p className="text-4xl font-black text-white mb-1">{waitingBookings + inProgressBookings}</p>
              <p className="text-[10px] text-amber-400 font-bold">Menunggu & dalam proses</p>
            </Card>

            {/* Dibatalkan */}
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 p-6 rounded-3xl">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <XCircle className="text-red-400" size={24} />
                </div>
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[8px] font-black">
                  {totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0'}%
                </Badge>
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dibatalkan</h3>
              <p className="text-4xl font-black text-white mb-1">{cancelledBookings}</p>
              <p className="text-[10px] text-red-400 font-bold">Perlu evaluasi</p>
            </Card>
          </div>

          {/* GRAFIK & TABEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP 5 LAYANAN TERPOPULER */}
            <Card className="bg-slate-900/40 border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <TrendingUp className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Layanan Terpopuler</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Top 5 {getPeriodLabel()}</p>
                </div>
              </div>

              <div className="space-y-4">
                {topServices.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">Belum ada data</p>
                ) : (
                  topServices.map((service, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-indigo-400 w-8">#{idx + 1}</span>
                          <div>
                            <p className="text-sm font-bold text-white uppercase">{service.service_name}</p>
                            <p className="text-[9px] text-slate-500 font-bold">
                              {service.completed} selesai • {service.cancelled} batal
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-black px-3">
                          {service.total_bookings}
                        </Badge>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${(service.total_bookings / maxBookings) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* DISTRIBUSI STATUS */}
            <Card className="bg-slate-900/40 border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Activity className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Distribusi Status</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Breakdown {getPeriodLabel()}</p>
                </div>
              </div>

              <div className="space-y-4">
                {statusDistribution.map((status, idx) => {
                  const percentage = totalBookings > 0 ? ((status.value / totalBookings) * 100).toFixed(1) : '0'
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <p className="text-sm font-bold text-white uppercase">{status.label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold ${status.textColor}`}>{percentage}%</span>
                          <Badge className="bg-slate-950/50 text-white border-slate-800 text-xs font-black px-3">
                            {status.value}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${status.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalBookings === 0 && (
                <p className="text-slate-500 text-center py-8 text-sm">Belum ada data untuk periode ini</p>
              )}
            </Card>
          </div>

          {/* TABEL PERFORMA LAYANAN */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <BarChart3 className="text-amber-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Performa Semua Layanan</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Analisis Detail {getPeriodLabel()}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-left">Layanan</th>
                    <th className="px-6 py-4 text-center">Total</th>
                    <th className="px-6 py-4 text-center">Selesai</th>
                    <th className="px-6 py-4 text-center">Batal</th>
                    <th className="px-6 py-4 text-center">Durasi Rata-rata</th>
                    <th className="px-6 py-4 text-center">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {serviceStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                        Belum ada data layanan
                      </td>
                    </tr>
                  ) : (
                    paginatedServiceStats.map((service, idx) => {
                      const successRate = service.total_bookings > 0 
                        ? ((service.completed / service.total_bookings) * 100).toFixed(1) 
                        : '0'
                      
                      return (
                        <tr key={idx} className="hover:bg-indigo-500/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white uppercase">{service.service_name}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-black">
                              {service.total_bookings}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-black">
                              {service.completed}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs font-black">
                              {service.cancelled}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-slate-300">
                              {service.avg_duration} menit
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    parseFloat(successRate) >= 80 ? 'bg-emerald-500' : 
                                    parseFloat(successRate) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-400 w-12 text-right">
                                {successRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {serviceStats.length > 0 && (
              <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Halaman {currentPage} dari {totalPages || 1} • Total {serviceStats.length} Layanan
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}