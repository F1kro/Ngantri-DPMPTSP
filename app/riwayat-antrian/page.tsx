"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getBookingsFromCookie, removeBookingFromCookie } from "@/lib/cookies";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
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
  services?: {
    name: string;
    estimated_duration: number;
  };
}

export default function MyQueueHistoryPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const cookieBookings = getBookingsFromCookie();
      if (cookieBookings.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }
      const bookingIds = cookieBookings.map((b) => b.id);
      
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name, estimated_duration)")
        .in("id", bookingIds)
        .order("booking_date", { ascending: false }) 
        .order("booking_time", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const channel = supabase
      .channel("user_history_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalPages = Math.ceil(bookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return bookings.slice(start, start + itemsPerPage);
  }, [bookings, currentPage]);

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: cancelReason.trim(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;
      toast.success("Berhasil dibatalkan");
      setCancelDialogOpen(false);
      setCancelReason("");
      fetchBookings();
    } catch (error) {
      toast.error("Gagal membatalkan");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      waiting: { label: "Menunggu", class: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: <Clock size={12} /> },
      in_progress: { label: "Melayani", class: "bg-indigo-500/10 text-indigo-400 border-indigo-400/20", icon: <AlertCircle size={12} /> },
      completed: { label: "Selesai", class: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20", icon: <CheckCircle2 size={12} /> },
      cancelled: { label: "Batal", class: "bg-red-500/10 text-red-400 border-red-400/20", icon: <XCircle size={12} /> },
    };
    const s = config[status as keyof typeof config] || config.waiting;
    return (
      <Badge className={`${s.class} border font-black text-[8px] md:text-[9px] uppercase gap-1 px-2 py-1 shrink-0`}>
        {s.icon} {s.label}
      </Badge>
    );
  };

  if (loading) return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* HEADER FIXED POSITIONING */}
        <header className="flex items-center justify-between bg-slate-900/60 p-4 rounded-[2rem] border border-slate-800 backdrop-blur-md shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 text-white">
              <History size={20} />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black uppercase tracking-tight leading-none">Riwayat</h1>
              <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Lombok Barat</p>
            </div>
          </div>
          <Link href="/" className="relative z-10">
            <Button variant="outline" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-800 border-slate-700 text-indigo-400 border-b-4 border-b-indigo-900/50 active:scale-95 transition-all">
              <Home size={20} />
            </Button>
          </Link>
        </header>

        {bookings.length === 0 ? (
          <Card className="bg-slate-900/20 border-slate-800 border-dashed rounded-[2.5rem] p-16 text-center">
            <History size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Tidak ada data antrean</p>
            <Link href="/booking" className="mt-6 block">
              <Button className="bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs px-8">AMBIL ANTREAN</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedBookings.map((booking) => (
              <Card key={booking.id} className="bg-slate-900/60 border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-indigo-500/30 transition-all border-2 relative">
                <CardContent className="p-0">
                  {/* Container Utama: Info & Status */}
                  <div className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 min-w-[70px] shadow-inner">
                          <p className="text-[7px] font-black text-slate-600 uppercase mb-0.5">No</p>
                          <h2 className="text-xl font-black font-mono text-indigo-400 leading-none">{booking.booking_number}</h2>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-base font-black text-white uppercase truncate">{booking.services?.name}</h3>
                          <div className="flex flex-col gap-1 mt-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Calendar size={12} />
                              <p className="text-[9px] md:text-[10px] font-black uppercase">{booking.booking_date}</p>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400/80">
                              <Clock size={12} />
                              <p className="text-[9px] md:text-[10px] font-black">{booking.booking_time} WITA</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Badge Status SEKARANG RELATIVE (Nggak ngerusak header) */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Tombol Aksi: Full width di mobile */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {booking.status !== "cancelled" && (
                        <Link href={`/booking-confirmation/${booking.id}`} className="flex-1">
                          <Button 
                            className="w-full h-12 bg-indigo-600/10 border-2 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase gap-2 transition-all"
                          >
                            <FileText size={16} /> LIHAT TIKET
                          </Button>
                        </Link>
                      )}

                      {booking.status === "waiting" && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setCancelDialogOpen(true);
                          }}
                          className="w-full sm:w-auto h-12 px-6 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                          BATALKAN
                        </Button>
                      )}
                    </div>
                  </div>

                  {booking.cancel_reason && (
                    <div className="bg-red-500/5 px-6 py-3 border-t border-red-500/10">
                      <p className="text-[9px] text-red-400/60 font-medium italic">Alasan: {booking.cancel_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {bookings.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800 shadow-xl">
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-slate-800 border-slate-700"><ChevronLeft size={18} /></Button>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">HAL {currentPage} / {totalPages}</span>
            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-slate-800 border-slate-700"><ChevronRight size={18} /></Button>
          </div>
        )}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white rounded-[2.5rem] max-w-[95vw] sm:max-w-sm p-8 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="p-3 bg-red-500/10 w-fit rounded-2xl text-red-500 border border-red-500/20 mx-auto">
              <XCircle size={28} />
            </div>
            <DialogTitle className="text-xl font-black uppercase text-center tracking-tight">Batalkan Antrean?</DialogTitle>
            <DialogDescription className="text-center text-[11px] text-slate-500 font-medium">Tindakan ini akan menghapus antrean <b>{selectedBooking?.booking_number}</b> secara permanen.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Textarea 
              placeholder="Berikan alasan pembatalan..." 
              className="bg-slate-900 border-slate-800 rounded-2xl resize-none text-xs h-28 text-white focus:ring-red-500/50 p-4" 
              value={cancelReason} 
              onChange={(e) => setCancelReason(e.target.value)} 
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="h-12 rounded-xl font-black text-xs flex-1 order-2 sm:order-1" onClick={() => setCancelDialogOpen(false)}>TUTUP</Button>
            <Button 
              disabled={cancelling || !cancelReason} 
              className="h-12 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs text-white flex-1 order-1 sm:order-2 shadow-lg shadow-red-600/20" 
              onClick={handleCancelBooking}
            >
              {cancelling ? <Loader2 className="animate-spin" size={16} /> : "YA, BATALKAN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}