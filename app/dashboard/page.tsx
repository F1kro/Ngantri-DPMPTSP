"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getBookingsFromCookie } from "@/lib/cookies";
import {
  requestNotificationPermission,
  notifyQueueCalled,
  notifyQueueReminder,
  getNotificationPermission,
  isNotificationSupported,
} from "@/lib/notifications";
import {
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  User,
  Ticket,
  Bell,
  BellOff,
  History as HistoryIcon,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Komponen Timer Mandiri
const MonitorTimer = ({
  startTime,
  durationMinutes,
}: {
  startTime: string;
  durationMinutes: number;
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculate = () => {
      if (!startTime) return;
      const start = new Date(startTime).getTime();
      const end = start + durationMinutes * 60000;
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes]);

  if (timeLeft === null)
    return <div className="text-2xl md:text-5xl font-mono text-slate-700">--:--</div>;

  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;

  return (
    <div className={`flex items-center gap-2 font-mono font-black text-2xl md:text-5xl ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-emerald-400"}`}>
      <Clock size={20} className="md:hidden" />
      <Clock size={32} className="hidden md:block" />
      {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
    </div>
  );
};

export default function PersonalMonitorPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userBookingIds, setUserBookingIds] = useState<string[]>([]);
  const [userBookingDetails, setUserBookingDetails] = useState<any[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const cookieBookings = getBookingsFromCookie();
    setUserBookingIds(cookieBookings.map((b) => b.id));
    setUserBookingDetails(cookieBookings);
    
    if (isNotificationSupported()) {
      setNotificationsEnabled(getNotificationPermission() === "granted");
    }
  }, []);

  const fetchData = async () => {
    const [bookingRes, serviceRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(name, estimated_duration)")
        .order("created_at", { ascending: true }),
      supabase.from("services").select("*").order("name"),
    ]);

    const allBookings = bookingRes.data || [];
    setBookings(allBookings);

    const allServices = serviceRes.data || [];
    
    // SMART SORTING: Prioritaskan layanan yang user booking
    const sortedServices = allServices.sort((a, b) => {
      // 1. Cek apakah user punya booking di layanan ini (dan belum completed)
      const userHasBookingA = allBookings.some(
        bk => bk.service_id === a.id && 
              userBookingIds.includes(bk.id) && 
              bk.status !== "completed"
      );
      const userHasBookingB = allBookings.some(
        bk => bk.service_id === b.id && 
              userBookingIds.includes(bk.id) && 
              bk.status !== "completed"
      );

      // Jika salah satu punya booking user, prioritaskan itu
      if (userHasBookingA && !userHasBookingB) return -1;
      if (!userHasBookingA && userHasBookingB) return 1;

      // 2. Jika sama-sama punya booking user, urutkan berdasarkan waktu booking
      if (userHasBookingA && userHasBookingB) {
        const bookingA = allBookings.find(
          bk => bk.service_id === a.id && userBookingIds.includes(bk.id)
        );
        const bookingB = allBookings.find(
          bk => bk.service_id === b.id && userBookingIds.includes(bk.id)
        );
        
        if (bookingA && bookingB) {
          return new Date(bookingA.created_at).getTime() - new Date(bookingB.created_at).getTime();
        }
      }

      // 3. Jika tidak ada booking user, urutkan berdasarkan jumlah antrian (terbanyak dulu)
      const countA = allBookings.filter(
        bk => bk.service_id === a.id && bk.status !== "completed"
      ).length;
      const countB = allBookings.filter(
        bk => bk.service_id === b.id && bk.status !== "completed"
      ).length;
      
      return countB - countA;
    });

    setServices(sortedServices);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("user-live-monitor")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          console.log("🔔 UPDATE DETECTED:", { 
            id: updated.id,
            number: updated.booking_number,
            oldStatus: old.status, 
            newStatus: updated.status,
            oldUpdatedAt: old.updated_at,
            newUpdatedAt: updated.updated_at,
            isUserBooking: userBookingIds.includes(updated.id)
          });

          // HANYA proses jika ini booking milik user
          if (!userBookingIds.includes(updated.id)) {
            console.log("❌ Bukan booking user, skip");
            fetchData();
            return;
          }

          console.log("✅ Ini booking user!");

          // 1. DETEKSI DIPANGGIL PERTAMA KALI (waiting -> in_progress)
          if (updated.status === "in_progress" && old.status === "waiting") {
            console.log("🔊 DIPANGGIL PERTAMA KALI!");
            
            if (notificationsEnabled) {
              notifyQueueCalled(updated.booking_number);
              toast.success(`NOMOR ANDA (${updated.booking_number}) SEDANG DIPANGGIL!`, {
                duration: 10000,
                icon: <Bell className="text-indigo-500" size={24} />
              });
            } else {
              toast.success(`NOMOR ANDA (${updated.booking_number}) SEDANG DIPANGGIL!`, {
                duration: 10000,
                icon: <Bell className="text-indigo-500" size={24} />
              });
            }
          }

          // 2. DETEKSI PANGGIL ULANG (status tetap in_progress, tapi updated_at berubah)
          else if (
            updated.status === "in_progress" && 
            old.status === "in_progress" && 
            updated.updated_at !== old.updated_at
          ) {
            console.log("🔊 DIPANGGIL ULANG!");
            
            if (notificationsEnabled) {
              notifyQueueCalled(updated.booking_number);
              toast.warning(`NOMOR ANDA (${updated.booking_number}) DIPANGGIL LAGI!`, {
                duration: 10000,
                icon: <Bell className="text-orange-500" size={24} />
              });
            } else {
              toast.warning(`NOMOR ANDA (${updated.booking_number}) DIPANGGIL LAGI!`, {
                duration: 10000,
                icon: <Bell className="text-orange-500" size={24} />
              });
            }
          }

          // 3. REMINDER - Cek posisi dalam waiting list
          if (updated.status === "waiting") {
            // Ambil fresh data untuk hitung posisi akurat
            supabase
              .from("bookings")
              .select("*")
              .eq("service_id", updated.service_id)
              .eq("status", "waiting")
              .order("created_at", { ascending: true })
              .then(({ data }) => {
                const waitingList = data || [];
                const position = waitingList.findIndex(b => b.id === updated.id);
                
                console.log(`📊 Posisi dalam antrian: ${position + 1} dari ${waitingList.length}`);
                
                // Reminder jika tinggal 2 antrian lagi (posisi index 1)
                if (position === 1 && notificationsEnabled) {
                  console.log("⏰ TRIGGER REMINDER - Tinggal 2 antrian!");
                  notifyQueueReminder(updated.booking_number, 2);
                  toast.info(`Nomor ${updated.booking_number} - Tinggal 2 antrian lagi!`, {
                    duration: 8000
                  });
                }
              });
          }

          fetchData();
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [notificationsEnabled, userBookingIds]);

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) {
      toast.error("Browser Anda tidak mendukung notifikasi");
      return;
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      toast.info("Notifikasi dimatikan");
    } else {
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        
        // PENTING: Pancing audio agar browser mengizinkan autoplay
        const audio = new Audio("/notif.mp3");
        audio.volume = 0;
        audio.play().catch(() => {});
        
        toast.success("✅ Notifikasi AKTIF! Suara akan berbunyi saat nomor Anda dipanggil.", {
          duration: 5000
        });
      } else {
        toast.error("Permission ditolak. Aktifkan notifikasi di browser settings.");
      }
    }
  };

  // Helper: Cek apakah user punya booking aktif di service ini
  const userHasActiveBookingInService = (serviceId: string) => {
    return bookings.some(
      b => b.service_id === serviceId && 
           userBookingIds.includes(b.id) && 
           b.status !== "completed"
    );
  };

  const totalPages = Math.ceil(services.length / (itemsPerPage || 1));
  const currentServices = services.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Hitung total booking user yang aktif
  const activeUserBookingsCount = bookings.filter(
    b => userBookingIds.includes(b.id) && b.status !== "completed"
  ).length;

  return (
    <main className="min-h-screen w-full bg-[#020617] text-slate-100 font-sans p-3 md:p-10 flex flex-col gap-4 md:gap-6 overflow-hidden">
      
      {/* HEADER SECTION */}
      <header className="bg-slate-900/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800 backdrop-blur-xl shrink-0 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2.5 md:p-4 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
              <Ticket size={24} />
            </div>
            <div>
              <h1 className="text-base md:text-2xl font-black tracking-tighter uppercase leading-none text-white">Cek Antrean</h1>
              <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">DPMPTSP Real-time</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[7px] md:text-[9px] font-black text-red-500 uppercase">Live</span>
                </div>
                {activeUserBookingsCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <Star size={10} className="text-indigo-400 fill-indigo-400" />
                    <span className="text-[7px] md:text-[9px] font-black text-indigo-400 uppercase">
                      {activeUserBookingsCount} Booking Aktif
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              onClick={handleToggleNotifications}
              variant="outline"
              className={`h-10 md:h-12 px-4 md:px-6 rounded-xl font-bold text-[10px] md:text-xs uppercase gap-2 flex-1 md:flex-none transition-all ${
                notificationsEnabled ? "bg-emerald-600/20 border-emerald-600/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              <span>{notificationsEnabled ? "Notif On" : "Notif Off"}</span>
            </Button>

            {userBookingIds.length > 0 && (
              <Link href="/riwayat-antrian" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full h-10 md:h-12 px-4 md:px-6 rounded-xl bg-indigo-600/20 border-indigo-600/30 text-indigo-400 font-bold text-[10px] md:text-xs uppercase gap-2">
                  <HistoryIcon size={16} />
                  <span>Riwayat</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* INFO BANNER - Tampil jika user punya booking */}
      {activeUserBookingsCount > 0 && (
        <div className="bg-indigo-600/10 border-2 border-indigo-600/30 p-3 md:p-4 rounded-xl md:rounded-[1.5rem] flex items-center gap-3 shrink-0 shadow-lg">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Star size={20} className="text-indigo-400 fill-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs md:text-sm font-black text-indigo-300 leading-tight">
              Layanan booking Anda ditampilkan prioritas!
            </p>
            <p className="text-[9px] md:text-[10px] font-medium text-slate-400 leading-tight mt-0.5">
              Scroll untuk melihat layanan lainnya
            </p>
          </div>
        </div>
      )}

      {/* PAGINATION CONTROLLER */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-2 rounded-xl md:rounded-[1.5rem] border border-slate-800 shrink-0 shadow-xl">
        <Button 
          disabled={currentPage === 1} 
          onClick={() => setCurrentPage(p => p - 1)} 
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600"
        >
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Kategori Layanan</p>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase">Hal {currentPage} / {totalPages}</h3>
        </div>
        <Button 
          disabled={currentPage >= totalPages} 
          onClick={() => setCurrentPage(p => p + 1)} 
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600"
        >
          <ChevronRight />
        </Button>
      </div>

      {/* SERVICE CARDS DISPLAY */}
      <div className={`flex-1 grid gap-4 md:gap-6 ${itemsPerPage === 1 ? "grid-cols-1" : "grid-cols-3"} min-h-0 overflow-hidden`}>
        {currentServices.map((service) => {
          const current = bookings.find(b => b.service_id === service.id && b.status === "in_progress");
          const waiting = bookings.filter(b => b.service_id === service.id && b.status === "waiting");
          const isUserBooking = current && userBookingIds.includes(current.id);
          const hasUserBookingInService = userHasActiveBookingInService(service.id);
          
          // Ambil detail booking user di service ini (jika ada)
          const userBookingInService = bookings.find(
            b => b.service_id === service.id && 
                 userBookingIds.includes(b.id) && 
                 b.status !== "completed"
          );

          return (
            <Card 
              key={service.id} 
              className={`bg-slate-900/60 border-slate-800 rounded-2xl md:rounded-[2.5rem] flex flex-col shadow-2xl border-2 transition-all h-full ${
                isUserBooking 
                  ? "border-indigo-500 ring-2 ring-indigo-500/50 animate-pulse" 
                  : hasUserBookingInService
                  ? "border-indigo-600/40 ring-1 ring-indigo-600/30"
                  : "border-transparent"
              }`}
            >
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-3 md:p-5 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {hasUserBookingInService && (
                      <Star size={14} className="text-indigo-400 fill-indigo-400 animate-pulse" />
                    )}
                    <h3 className="font-black uppercase text-[10px] text-indigo-400 truncate pr-4">
                      {service.name}
                    </h3>
                  </div>
                  {current && <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Antrean Sekarang</p>
                    <h2 className={`text-6xl md:text-[8rem] font-black font-mono leading-none ${isUserBooking ? "text-indigo-400" : "text-white"}`}>
                      {current?.booking_number || "---"}
                    </h2>
                    {isUserBooking && (
                      <Badge className="bg-indigo-600 text-white font-black text-xs animate-bounce mt-2">
                        NOMOR ANDA!
                      </Badge>
                    )}
                    {!isUserBooking && userBookingInService && (
                      <Badge className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 font-black text-[9px] mt-2">
                        Nomor Anda: {userBookingInService.booking_number}
                      </Badge>
                    )}
                  </div>

                  {current && <MonitorTimer startTime={current.updated_at} durationMinutes={service.estimated_duration || 15} />}

                  <div className="w-full p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex items-center gap-4">
                    <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                      <User size={20} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sedang Melayani</p>
                      <p className="text-sm font-black text-white uppercase truncate">
                        {current?.visitor_name || "Menunggu..."}
                      </p>
                    </div>
                  </div>

                  {/* Info Posisi User (jika ada booking di service ini) */}
                  {userBookingInService && userBookingInService.status === "waiting" && (
                    <div className="w-full p-3 bg-indigo-600/10 border border-indigo-600/20 rounded-xl">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        Posisi Anda
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black text-indigo-400 font-mono">
                          {waiting.findIndex(b => b.id === userBookingInService.id) + 1}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          dari {waiting.length} antrian
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">Sisa</p>
                    <p className="text-3xl font-black text-white font-mono">{waiting.length}</p>
                  </div>
                  <div className="border-l border-slate-800">
                    <p className="text-[8px] font-black text-slate-600 uppercase">Estimasi</p>
                    <p className="text-3xl font-black text-emerald-400 font-mono">
                      {waiting.length * (service.estimated_duration || 15)}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-indigo-600/10 border border-indigo-600/20 p-4 rounded-xl md:rounded-[1.5rem] flex items-center gap-4 shrink-0 shadow-lg">
        <Activity size={24} className="text-indigo-500" />
        <p className="text-xs font-medium text-slate-400 italic leading-tight">
          Nomor antrean diperbarui secara otomatis. Aktifkan notifikasi untuk mendapat pemberitahuan saat nomor Anda dipanggil.
        </p>
      </div>
    </main>
  );
}