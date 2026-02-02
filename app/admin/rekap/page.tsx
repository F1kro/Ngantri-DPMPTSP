'use client'
import React, { useState, useEffect, useMemo } from "react"
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/admin/sidebar'
import * as XLSX from 'xlsx'
import { FileDown, Search, Calendar, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function RekapAntrean() {
  const supabase = createClient()
  const [data, setData] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [filterPeriode, setFilterPeriode] = useState('semua')
  const [filterLayanan, setFilterLayanan] = useState('semua')

  // --- LOGIC PAGINASI ---
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const fetchData = async () => {
    setLoading(true)
    const [bookingRes, serviceRes] = await Promise.all([
      supabase.from('bookings').select('*, services(name)').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('name')
    ])
    setData(bookingRes.data || [])
    setServices(serviceRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const date = new Date(item.created_at)
      const now = new Date()
      
      const matchesSearch = item.visitor_name.toLowerCase().includes(search.toLowerCase()) ||
                            item.booking_number.toLowerCase().includes(search.toLowerCase())
      
      const matchesLayanan = filterLayanan === 'semua' || item.service_id === filterLayanan

      let matchesPeriode = true
      if (filterPeriode === 'hari-ini') {
        matchesPeriode = date.toDateString() === now.toDateString()
      } else if (filterPeriode === 'minggu-ini') {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        matchesPeriode = date >= weekAgo
      } else if (filterPeriode === 'bulan-ini') {
        matchesPeriode = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }

      return matchesSearch && matchesLayanan && matchesPeriode
    })
    setCurrentPage(1) // Reset ke halaman 1 tiap filter berubah
    return result
  }, [data, search, filterLayanan, filterPeriode])

  // Hitung data yang tampil per halaman
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  const downloadExcel = () => {
    const report = filteredData.map(d => ({
      'Tanggal': new Date(d.created_at).toLocaleDateString('id-ID'),
      'Waktu': new Date(d.created_at).toLocaleTimeString('id-ID'),
      'Nomor Antrean': d.booking_number,
      'Nama Pengunjung': d.visitor_name,
      'No. Telepon': d.visitor_phone,
      'Keperluan/Layanan': d.services?.name,
      'Status': d.status.toUpperCase()
    }))
    const ws = XLSX.utils.json_to_sheet(report)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Antrean")
    XLSX.writeFile(wb, `Rekap_DPMPTSP_${filterPeriode}.xlsx`)
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {/* HEADER - Lebih Ramping */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Rekap Antrean</h2>
              <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.2em]">Arsip Data Pengunjung</p>
            </div>
            <Button onClick={downloadExcel} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black h-10 px-6 rounded-xl shadow-lg gap-2 transition-all active:scale-95">
              <FileDown size={16} /> Print Excel
            </Button>
          </header>

          {/* TOOLBAR FILTER - 2 CONTAINER TERPISAH */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-3xl backdrop-blur-xl shrink-0">
            <div className="flex items-end justify-between gap-4">
              {/* CONTAINER KIRI - 3 FILTER */}
              <div className="flex flex-wrap items-end gap-2.5">
                {/* CARI DATA */}
                <div className="w-[240px]">
                  <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    <Search size={11} className="text-indigo-400"/> Cari Data
                  </label>
                  <Input 
                    placeholder="Nama / Nomor..." 
                    className="bg-slate-950/50 border-slate-800 h-10 px-3.5 text-white rounded-xl focus:border-indigo-500/50 transition-all text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* PERIODE */}
                <div className="w-[165px]">
                  <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    <Calendar size={11} className="text-indigo-400"/> Periode
                  </label>
                  <Select value={filterPeriode} onValueChange={setFilterPeriode}>
                    <SelectTrigger className="h-10 bg-slate-950/50 border-slate-800 text-white rounded-xl font-bold uppercase text-[10px] px-3.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                      <SelectItem value="semua">Semua Waktu</SelectItem>
                      <SelectItem value="hari-ini">Hari Ini</SelectItem>
                      <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
                      <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* LAYANAN */}
                <div className="w-[185px]">
                  <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    <Filter size={11} className="text-indigo-400"/> Layanan
                  </label>
                  <Select value={filterLayanan} onValueChange={setFilterLayanan}>
                    <SelectTrigger className="h-10 bg-slate-950/50 border-slate-800 text-white rounded-xl font-bold uppercase text-[10px] px-3.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                      <SelectItem value="semua">Semua Layanan</SelectItem>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CONTAINER KANAN - TOTAL */}
              <div className="h-10 flex items-center justify-center px-5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl shrink-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Total: <span className="text-indigo-400 text-base ml-1 tabular-nums">{filteredData.length}</span>
                </p>
              </div>
            </div>
          </div>

          {/* TABEL DATA */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 z-10">
                  <tr>
                    <th className="px-5 py-4">Waktu</th>
                    <th className="px-5 py-4">No. Antrean</th>
                    <th className="px-5 py-4">Nama Lengkap</th>
                    <th className="px-5 py-4">Kontak</th>
                    <th className="px-5 py-4">Layanan</th>
                    <th className="px-5 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-indigo-400">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        <span className="font-bold uppercase tracking-widest text-[9px]">Sinkronisasi Data Sedang Berlangsung...</span>
                      </td>
                    </tr>
                  ) : paginatedData.map(d => (
                    <tr key={d.id} className="hover:bg-indigo-500/[0.02] transition-colors group">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-slate-200 font-bold text-xs">{new Date(d.created_at).toLocaleDateString('id-ID')}</p>
                        <p className="text-[9px] text-slate-500 font-mono italic">{new Date(d.created_at).toLocaleTimeString('id-ID')}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-lg font-mono font-black text-indigo-400">
                          {d.booking_number}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-black text-white uppercase text-xs truncate max-w-[180px]">{d.visitor_name}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">{d.visitor_phone}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block bg-slate-950/50 px-3 py-1 rounded-lg border border-slate-800 text-[8px] font-bold text-slate-400 uppercase">
                          {d.services?.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge className={`
                          ${d.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            d.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                            d.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                          border px-3 py-0.5 font-black text-[8px] tracking-wider rounded-md
                        `}>
                          {d.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* --- BAR NAVIGASI PAGINASI --- */}
            <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Halaman {currentPage} dari {totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {!loading && filteredData.length === 0 && (
              <div className="py-12 text-center border-t border-slate-800 bg-slate-950/20">
                <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Data tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}