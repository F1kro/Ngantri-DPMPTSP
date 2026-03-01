"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBookingsFromCookie } from "@/lib/cookies";
import { createLog } from "@/lib/logger"; // IMPORT LOGGER
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  History, ChevronLeft, ChevronRight, Home, Loader2,
  Clock, CheckCircle2, XCircle, AlertCircle, Calendar,
  FileText, ShieldAlert, Monitor
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface BookingDetail {
  id: string;
  booking_number: string;
  visitor_name: string;
  visitor_phone: string;
  status: string;
  created_at: string;
  booking_date: string;
  booking_time: string;
  cancelled_at?: string;
  cancel_reason?: string;
  notes?: string;
  services?: { name: string; estimated_duration: number };
}

const ADMIN_CANCEL_REASONS = ["Orang tidak ada di tempat", "Dokumen tidak lengkap", "Minta reschedule"];
const ADMIN_REASON_DISPLAY: Record<string, string> = {
  "Orang tidak ada di tempat": "Tidak hadir saat dipanggil",
  "Dokumen tidak lengkap": "Dokumen tidak lengkap",
  "Minta reschedule": "Meminta jadwal ulang",
};

const isAdminCancelled = (b: BookingDetail) =>
  b.status === "cancelled" && !!b.notes && ADMIN_CANCEL_REASONS.includes(b.notes);

const getCancelReason = (b: BookingDetail) => {
  if (b.notes && ADMIN_CANCEL_REASONS.includes(b.notes)) return ADMIN_REASON_DISPLAY[b.notes] || b.notes;
  return b.cancel_reason || b.notes || "Tidak ada keterangan";
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; icon: React.ReactNode }> = {
  waiting:    { label: "Menunggu",          dot: "bg-amber-500",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   icon: <Clock size={11} /> },
  in_progress:{ label: "Sedang Dilayani",   dot: "bg-indigo-500", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",icon: <AlertCircle size={11} /> },
  completed:  { label: "Selesai",           dot: "bg-emerald-500",badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={11} /> },
  cancelled:  { label: "Dibatalkan",        dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400 border-red-400/20",           icon: <XCircle size={11} /> },
  cancelled_admin: { label: "Dibatalkan Admin", dot: "bg-red-600", badge: "bg-red-600/10 text-red-400 border-red-500/30",        icon: <ShieldAlert size={11} /> },
};

const getStatusKey = (b: BookingDetail) =>
  b.status === "cancelled" && isAdminCancelled(b) ? "cancelled_admin" : b.status;

export default function MyQueueHistoryPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); 
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // Kunci 4 item per halaman

  const fetchBookings = async () => {
    try {
      const cookieBookings = getBookingsFromCookie();
      if (!cookieBookings || cookieBookings.length === 0) { 
        setBookings([]); 
        setLoading(false); 
        return; 
      }
      const ids = cookieBookings.map((b: any) => b.id);
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name, estimated_duration)")
        .in("id", ids)
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal sinkron riwayat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true); 
    fetchBookings();
    const ch = supabase
      .channel("user_history_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totalPages = Math.ceil(bookings.length / itemsPerPage);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return bookings.slice(start, start + itemsPerPage);
  }, [bookings, currentPage]);

  const handleCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled", 
          cancelled_at: new Date().toISOString(), 
          cancel_reason: cancelReason.trim().substring(0, 50) // Keamanan tambahan di sisi logic
        })
        .eq("id", selectedBooking.id);
      
      if (error) throw error;

      createLog(
        'CANCEL', 
        `User [${selectedBooking.visitor_name}] membatalkan antrean ${selectedBooking.booking_number}. Alasan: ${cancelReason.trim()}`,
        'warning',
        { booking_id: selectedBooking.id, cancelled_by: 'USER' }
      );

      toast.success("Berhasil dibatalkan");
      setCancelDialogOpen(false);
      setCancelReason("");
      fetchBookings();
    } catch { 
      toast.error("Gagal membatalkan"); 
    } finally { 
      setCancelling(false); 
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-xl shrink-0 shadow-lg shadow-indigo-600/20">
            <History size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight leading-none text-white ">Riwayat Antrean</h1>
            <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">DPMPTSP LOBAR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/antrean">
            <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400  gap-2 text-[10px] font-black uppercase border-b-4 border-indigo-900 active:translate-y-[2px] active:border-b-0 transition-all">
              <Monitor size={14} /> Antrean
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="h-10 rounded-2xl gap-2 bg-slate-800/50 border-slate-700 text-indigo-400 font-black text-[10px] md:text-xs uppercase border-b-4 border-b-indigo-900/50"><Home size={14} /> Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-5 bg-slate-900/50 rounded-full mb-4">
               <History size={44} className="text-slate-700" />
            </div>
            <p className="text-slate-500 font-black uppercase text-xs mb-6 tracking-tighter">Belum Ada Riwayat Antrean</p>
            <Link href="/booking">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-b-4 border-indigo-800 rounded-2xl font-black text-xs px-8 h-12 shadow-xl active:scale-95 transition-all">
                AMBIL ANTREAN BARU
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {paginatedBookings.map((booking) => {
              const key = getStatusKey(booking);
              const sc = STATUS_CONFIG[key] ?? STATUS_CONFIG.waiting;
              const adminBatal = isAdminCancelled(booking);
              const reason = getCancelReason(booking);

              return (
                <div key={booking.id}
                  className={`bg-slate-900/70 rounded-3xl border-2 overflow-hidden transition-all shadow-lg ${
                    adminBatal ? "border-red-500/20 bg-red-500/[0.02]" : 
                    booking.status === "in_progress" ? "border-indigo-500/30 bg-indigo-500/[0.02]" : 
                    "border-slate-800/80"
                  }`}
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="bg-slate-950 rounded-2xl px-3 py-2.5 text-center border border-slate-800 shrink-0 min-w-[64px] shadow-inner">
                      <p className="text-[6px] font-black text-slate-600 uppercase mb-0.5 tracking-tighter">No Antrean</p>
                      <p className="text-xl font-black font-mono text-indigo-400 leading-none">{booking.booking_number}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-black text-white uppercase leading-tight truncate pr-1 tracking-tight">
                          {booking.services?.name}
                        </p>
                        <Badge className={`${sc.badge} border font-black text-[7px] uppercase gap-1 px-2 py-1 flex items-center shadow-sm`}>
                          {sc.icon} <span className="ml-0.5">{sc.label}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar size={10} className="text-indigo-500/50" />
                          <span className="text-[9px] font-bold uppercase">{booking.booking_date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-400/70">
                          <Clock size={10} className="text-indigo-500/50" />
                          <span className="text-[9px] font-bold">{booking.booking_time} WITA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.status === "cancelled" && adminBatal && (
                    <div className="mx-4 mb-3 flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-inner">
                      <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[7px] font-black text-red-400 uppercase tracking-widest">Dibatalkan Oleh Sistem/Admin</p>
                        <p className="text-[10px] text-red-200/90 font-bold leading-tight mt-0.5 italic">"{reason}"</p>
                      </div>
                    </div>
                  )}

                  <div className="px-4 pb-4 flex gap-2">
                    <Link href={`/booking-confirmation/${booking.id}`} className="flex-1">
                      <Button className="w-full h-11 bg-slate-800 hover:bg-indigo-600/20 border border-slate-700 text-indigo-400 rounded-2xl text-[10px] font-black uppercase gap-1.5 shadow-md border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0 transition-all">
                        <FileText size={13} /> {booking.status === 'completed' ? 'Detail' : 'Lihat Tiket'}
                      </Button>
                    </Link>
                    {booking.status === "waiting" && (
                      <Button
                        variant="ghost"
                        onClick={() => { setSelectedBooking(booking); setCancelDialogOpen(true); }}
                        className="h-11 px-4 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase transition-all active:scale-95"
                      >
                        Batal
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6 pb-10">
                <Button 
                  disabled={currentPage === 1} 
                  onClick={() => {
                    setCurrentPage((p) => p - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-slate-900 border-slate-700 text-slate-400 border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0"
                >
                  <ChevronLeft size={15} />
                </Button>
                
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`rounded-full transition-all duration-300 ${
                        currentPage === i + 1 ? "w-6 h-1.5 bg-indigo-500" : "w-1.5 h-1.5 bg-slate-700"
                      }`}
                    />
                  ))}
                </div>

                <Button 
                  disabled={currentPage === totalPages} 
                  onClick={() => {
                    setCurrentPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-slate-900 border-slate-700 text-slate-400 border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0"
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white rounded-[2rem] max-w-[92vw] sm:max-w-sm p-6 shadow-2xl border-2">
          <DialogHeader className="space-y-3 text-center">
            <div className="p-3 bg-red-500/10 w-fit rounded-2xl text-red-500 border border-red-500/20 mx-auto">
              <XCircle size={26} />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tighter">Batalkan Antrean?</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500 font-medium">
              Antrean <b className="text-indigo-400">{selectedBooking?.booking_number}</b> akan dibatalkan secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex justify-between items-center px-1">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alasan Pembatalan</label>
               <span className={`text-[9px] font-bold ${cancelReason.length >= 50 ? 'text-red-500' : 'text-slate-600'}`}>{cancelReason.length}/50</span>
            </div>
            <Textarea
              placeholder="Contoh: Ada keperluan mendadak..."
              maxLength={50}
              className="bg-slate-900 border-slate-800 rounded-2xl resize-none text-xs h-24 text-white p-4 focus:border-indigo-500/50 transition-all"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button disabled={cancelling || !cancelReason.trim()}
              className="h-12 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-xs text-white border-b-4 border-red-800 shadow-lg transition-all active:translate-y-[2px] active:border-b-0"
              onClick={handleCancel}>
              {cancelling ? <Loader2 className="animate-spin" size={15} /> : "YA, KONFIRMASI BATAL"}
            </Button>
            <Button variant="ghost" className="h-11 rounded-2xl font-black text-xs text-slate-500 hover:text-slate-300"
              onClick={() => setCancelDialogOpen(false)}>
              KEMBALI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}