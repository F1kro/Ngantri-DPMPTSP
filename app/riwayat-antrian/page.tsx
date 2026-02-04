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
  Trash2,
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
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Pagination State
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
        .order("created_at", { ascending: false });

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Logic Pagination
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
      removeBookingFromCookie(selectedBooking.id);
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
      waiting: {
        label: "Menunggu",
        class: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        icon: <Clock size={12} />,
      },
      in_progress: {
        label: "Melayani",
        class: "bg-indigo-500/10 text-indigo-400 border-indigo-400/20",
        icon: <AlertCircle size={12} />,
      },
      completed: {
        label: "Selesai",
        class: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20",
        icon: <CheckCircle2 size={12} />,
      },
      cancelled: {
        label: "Batal",
        class: "bg-red-500/10 text-red-400 border-red-400/20",
        icon: <XCircle size={12} />,
      },
    };
    const s = config[status as keyof typeof config] || config.waiting;
    return (
      <Badge
        className={`${s.class} border font-bold text-[9px] uppercase gap-1 px-2`}
      >
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* HEADER & NAV */}
        <header className="flex items-center justify-between bg-slate-900/60 p-3 md:p-4 rounded-3xl border border-slate-800 backdrop-blur-md shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 ml-1">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
              <History size={18} className="text-white" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm md:text-lg font-black uppercase tracking-tight leading-none">Riwayat</h1>
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
              <span>Kembali ke Dashboard</span>
            </Button>
          </Link>
        </header>

        {/* CONTENT */}
        {bookings.length === 0 ? (
          <Card className="bg-slate-900/20 border-slate-800 border-dashed rounded-[2rem] p-16 text-center">
            <History size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
              Tidak ada data antrean
            </p>
            <Link href="/booking">
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs">
                AMBIL ANTREAN
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedBookings.map((booking) => (
              <Card
                key={booking.id}
                className="bg-slate-900/60 border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                      <p className="text-[8px] font-black text-slate-600 uppercase">
                        No
                      </p>
                      <h2 className="text-2xl font-black font-mono text-indigo-400 leading-none">
                        {booking.booking_number}
                      </h2>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase truncate max-w-[150px]">
                        {booking.services?.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {new Date(booking.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(booking.status)}
                    {(booking.status === "waiting" ||
                      booking.status === "in_progress") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setCancelDialogOpen(true);
                        }}
                        className="h-7 px-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-[9px] font-black uppercase"
                      >
                        BATALKAN
                      </Button>
                    )}
                  </div>
                </CardContent>
                {booking.cancel_reason && (
                  <div className="bg-red-500/5 px-5 py-2 border-t border-red-500/10">
                    <p className="text-[9px] text-red-400 italic">
                      Alasan: {booking.cancel_reason}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* PAGINATION CONTROLLER */}
        {bookings.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-4 bg-slate-900/40 p-2 rounded-2xl border border-slate-800">
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-slate-800 border-slate-700"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-[10px] font-black text-slate-500 uppercase">
              HAL {currentPage} / {totalPages}
            </span>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-slate-800 border-slate-700"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Cancel */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-center">
              Batalkan Antrean?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-400">
              Tindakan ini akan menghapus antrean anda dari sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Textarea
              placeholder="Alasan pembatalan..."
              className="bg-slate-950 border-slate-800 rounded-xl resize-none text-xs"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter className="flex flex-row gap-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-xl font-bold text-xs"
              onClick={() => setCancelDialogOpen(false)}
            >
              TUTUP
            </Button>
            <Button
              disabled={cancelling || !cancelReason}
              className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs"
              onClick={handleCancelBooking}
            >
              {cancelling ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                "YA, BATALKAN"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}