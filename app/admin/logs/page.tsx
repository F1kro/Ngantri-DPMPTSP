'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/admin/sidebar'
import { 
  History, 
  AlertCircle, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Terminal,
  SortAsc,
  SortDesc,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SystemLogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [filterAction, setFilterAction] = useState('semua') // State Filter Aksi
  const itemsPerPage = 7 // Batasi 7 per halaman

  // Daftar tipe aksi sesuai logger.ts
  const ACTION_TYPES = [
    'BOOKING', 'CALL', 'COMPLETE', 'CANCEL', 'SERVICE_CRUD', 'PRINT_REKAP', 'SYSTEM', 'ERROR'
  ]

  useEffect(() => {
    fetchLogs()
  }, [page, sortOrder, filterAction])

  const fetchLogs = async () => {
    setLoading(true)
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: sortOrder === 'asc' })
      .range(from, to)

    // Apply Filter jika bukan 'semua'
    if (filterAction !== 'semua') {
      query = query.eq('action_type', filterAction)
    }

    const { data, error } = await query

    if (!error) setLogs(data)
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error': return <AlertCircle className="text-red-500" size={14} />
      case 'warning': return <AlertCircle className="text-amber-500" size={14} />
      default: return <Info className="text-indigo-400" size={14} />
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Log Sistem</h2>
              <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                Audit Trail & Monitoring Aktivitas (WITA)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* FILTER JENIS INFO */}
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1 px-3 rounded-xl shadow-xl h-10">
                <Filter size={14} className="text-indigo-400" />
                <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px] h-7 bg-transparent border-none text-[10px] font-black uppercase text-slate-300 focus:ring-0 p-0">
                    <SelectValue placeholder="Jenis Aksi" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="semua" className="text-[10px] font-bold uppercase">Semua Aksi</SelectItem>
                    {ACTION_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-[10px] font-bold uppercase">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TOMBOL SORTING */}
              <Button 
                onClick={() => {
                  setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                  setPage(1);
                }}
                variant="outline" 
                className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white font-bold text-[10px] uppercase h-10 px-4 rounded-xl gap-2 shadow-xl"
              >
                {sortOrder === 'desc' ? <SortDesc size={16}/> : <SortAsc size={16}/>}
                Urutan: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
              </Button>

            </div>
          </header>

          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl border-2 flex flex-col min-h-0">
            <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <History className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase">History Aktivitas</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Urutan kejadian sistem terfilter</p>
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Waktu (WITA)</th>
                    <th className="px-6 py-4">Aksi</th>
                    <th className="px-6 py-4">Pesan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-32 text-center">
                        <Loader2 className="animate-spin mx-auto mb-4 text-indigo-400" size={40} />
                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Sinkronisasi Log...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">
                        Tidak ada aktivitas ditemukan untuk filter ini
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-indigo-600/[0.02] transition-colors border-b border-slate-800/50 group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] text-indigo-400 font-bold leading-none">
                              {format(new Date(log.created_at), 'HH:mm:ss', { locale: id })}
                            </span>
                            <span className="text-[9px] text-slate-600 font-bold mt-1">
                              {format(new Date(log.created_at), 'dd MMM yyyy', { locale: id })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-slate-950 border-slate-800 text-slate-400 text-[8px] font-black px-2 py-0.5 group-hover:border-indigo-500/50 transition-colors uppercase">
                            {log.action_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                            {log.message}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border border-slate-800 bg-slate-950/50 shadow-inner`}>
                            {getStatusIcon(log.status)}
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              log.status === 'error' ? 'text-red-400' : 
                              log.status === 'warning' ? 'text-amber-400' : 'text-indigo-400'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Halaman <span className="text-white">{page}</span> • Monitoring Logs
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-9 w-9 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white rounded-xl transition-all"
                >
                  <ChevronLeft size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={logs.length < itemsPerPage}
                  onClick={() => setPage(p => p + 1)}
                  className="h-9 w-9 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white rounded-xl transition-all"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}