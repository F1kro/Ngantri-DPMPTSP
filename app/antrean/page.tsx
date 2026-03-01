"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getBookingsFromCookie } from "@/lib/cookies";
import { unlockTTS } from "@/lib/notifications";

import {
  requestNotificationPermission,
  notifyQueueCalled,
  getNotificationPermission,
  isNotificationSupported,
  playTTSNotification,
} from "@/lib/notifications";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Ticket,
  Bell,
  BellOff,
  History as HistoryIcon,
  Star,
  Home,
  SkipForward,
  AlertCircle,
  CalendarDays,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- HELPER WITA ---
const getWitaDateString = () => {
  const now = new Date();
  const witaString = now.toLocaleString("en-US", { timeZone: "Asia/Makassar" });
  const d = new Date(witaString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const SKIP_REASON_MAP: Record<string, string> = {
  "Orang tidak ada di tempat": "Anda tidak ada di tempat saat dipanggil",
  "Dokumen tidak lengkap": "Dokumen Anda belum lengkap",
  "Minta reschedule": "Anda meminta penjadwalan ulang",
};

const getSkipReasonDisplay = (notes: string | null) => {
  if (!notes) return "Antrean Anda dilewati oleh petugas";
  return SKIP_REASON_MAP[notes] || notes;
};

export default function PersonalMonitorPage() {
  const supabase = createClient();
  const [ttsReady, setTtsReady] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userBookingIds, setUserBookingIds] = useState<string[]>([]);
  const [userBookingDetails, setUserBookingDetails] = useState<any[]>([]);
  const [skippedInfo, setSkippedInfo] = useState<Record<string, { reason: string; at: Date }>>({});
  
  // LOGIC TAMBAHAN UNTUK SMART ALERT
  const [allUserBookings, setAllUserBookings] = useState<any[]>([]);
  
  useEffect(() => {
    const handler = () => unlockTTS();
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  const notificationsEnabledRef = useRef(false);
  const userBookingIdsRef = useRef<string[]>([]);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    userBookingIdsRef.current = userBookingIds;
  }, [userBookingIds]);

  useEffect(() => {
    import("@/lib/notifications").then((mod) => {
      mod.initTTSVoices();
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    const todayWita = getWitaDateString();

    const [bookingRes, serviceRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(name, prefix_code)")
        .eq("booking_date", todayWita)
        .order("booking_time", { ascending: true }),
      supabase.from("services").select("*").order("name"),
    ]);

    const allBookings = bookingRes.data || [];
    const idsToUse = userBookingIdsRef.current;

    setBookings(allBookings);

    const allServices = serviceRes.data || [];
    const sortedServices = allServices.sort((a: any, b: any) => {
      const userHasA = allBookings.some(
        (bk) => bk.service_id === a.id && idsToUse.includes(bk.id) && bk.status !== "completed"
      );
      const userHasB = allBookings.some(
        (bk) => bk.service_id === b.id && idsToUse.includes(bk.id) && bk.status !== "completed"
      );
      if (userHasA && !userHasB) return -1;
      if (!userHasA && userHasB) return 1;
      return 0;
    });
    setServices(sortedServices);
  }, [supabase]);

  // FETCH SEMUA BOOKING USER UNTUK SMART ALERT (Masa Depan)
  const fetchAllUserBookings = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .in("id", ids)
      .neq("status", "completed")
      .neq("status", "cancelled");
    setAllUserBookings(data || []);
  }, [supabase]);

  useEffect(() => {
    const cookieBookings = getBookingsFromCookie();
    const ids = cookieBookings.map((b: any) => b.id);

    userBookingIdsRef.current = ids;
    setUserBookingIds(ids);
    setUserBookingDetails(cookieBookings);
    fetchAllUserBookings(ids);

    if (isNotificationSupported()) {
      const perm = getNotificationPermission();
      notificationsEnabledRef.current = perm === "granted";
      setNotificationsEnabled(perm === "granted");
    }

    fetchData();
  }, [fetchData, fetchAllUserBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("user-live-monitor")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          fetchData();

          const currentIds = userBookingIdsRef.current;
          if (!currentIds.includes(updated.id)) return;

          const isNotifEnabled = notificationsEnabledRef.current;

          if (updated.status === "in_progress" && old.status === "waiting") {
            if (isNotifEnabled) notifyQueueCalled(updated.booking_number);
            else {
              const nomorEja = updated.booking_number.replace("-", " ").split("").join(" ");
              playTTSNotification(`Nomor antrean ${nomorEja}, silakan menuju loket pelayanan.`);
            }
            toast.success(`NOMOR ANDA (${updated.booking_number}) SEDANG DIPANGGIL!`, {
              duration: 10000,
              icon: <Bell className="text-indigo-500" size={24} />,
            });
          }
          else if (updated.status === "in_progress" && old.status === "in_progress") {
            if (isNotifEnabled) notifyQueueCalled(updated.booking_number);
            else {
              const nomorEja = updated.booking_number.replace("-", " ").split("").join(" ");
              playTTSNotification(`Nomor antrean ${nomorEja}, dipanggil kembali. Silakan menuju loket.`);
            }
            toast.warning(`NOMOR ANDA (${updated.booking_number}) DIPANGGIL LAGI!`, {
              duration: 10000,
              icon: <Bell className="text-orange-500" size={24} />,
            });
          }
          else if (updated.status === "waiting" && old.status === "in_progress") {
            const reasonDisplay = getSkipReasonDisplay(updated.notes);
            setSkippedInfo((prev) => ({
              ...prev,
              [updated.id]: { reason: reasonDisplay, at: new Date() },
            }));
            toast.error(
              <div className="flex flex-col gap-1">
                <span className="font-black text-sm">Antrean {updated.booking_number} Dilewati</span>
                <span className="text-xs text-slate-300">{reasonDisplay}</span>
              </div>,
              { duration: 15000, icon: <SkipForward className="text-amber-500" size={24} /> }
            );
          }
          else if (updated.status === "cancelled") {
            toast.error(`Antrean ${updated.booking_number} Dibatalkan`, {
              icon: <AlertCircle className="text-red-500" />,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) return toast.error("Browser tidak mendukung notifikasi");
    if (notificationsEnabled) {
      notificationsEnabledRef.current = false;
      setNotificationsEnabled(false);
      toast.info("Notifikasi dimatikan");
    } else {
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        notificationsEnabledRef.current = true;
        setNotificationsEnabled(true);
        toast.success("✅ Notifikasi AKTIF!");
      }
    }
  };

  const userHasActiveBookingInService = (serviceId: string) => {
    return bookings.some(
      (b) => b.service_id === serviceId && userBookingIdsRef.current.includes(b.id) && b.status !== "completed"
    );
  };

  // Logika Cek Antrean Masa Depan (Besok/Lusa)
  const futureBookings = useMemo(() => {
    const today = getWitaDateString();
    return allUserBookings.filter(b => b.booking_date > today);
  }, [allUserBookings]);

  const totalPages = Math.ceil(services.length / (itemsPerPage || 1));
  const currentServices = services.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const activeUserBookingsCount = bookings.filter(
    (b) => userBookingIdsRef.current.includes(b.id) && b.status !== "completed"
  ).length;

  return (
    <main className="min-h-screen w-full bg-[#020617] text-slate-100 font-sans p-3 md:p-10 flex flex-col gap-4 md:gap-6 overflow-hidden">
      <header className="bg-slate-900/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-800 backdrop-blur-xl shrink-0 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2.5 md:p-4 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg text-white">
              <Ticket size={24} />
            </div>
            <div>
              <h1 className="text-base md:text-2xl font-black tracking-tighter uppercase leading-none text-white">
                Cek Antrean
              </h1>
              <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Sistem Antrian Online DPMPTSP - LOBAR
                </p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[7px] md:text-[9px] font-black text-red-500 uppercase">Live</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="h-10 rounded-2xl gap-2 bg-slate-800/50 border-slate-700 text-indigo-400 font-black text-[10px] md:text-xs uppercase border-b-4 border-b-indigo-900/50"><Home size={14} /> Dashboard</Button>
            </Link>
            <Button
              onClick={handleToggleNotifications}
              variant="outline"
              className={`h-10 md:h-12 px-4 md:px-6 rounded-xl font-bold text-[10px] md:text-xs uppercase gap-2 flex-1 md:flex-none transition-all active:translate-y-[2px] active:border-b-0 border-b-4 ${
                notificationsEnabled
                  ? "bg-emerald-600/20 border-emerald-600/30 text-emerald-400 border-b-emerald-800"
                  : "bg-slate-800 border-slate-700 text-slate-400 border-b-slate-950"
              }`}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              <span>{notificationsEnabled ? "Notif On" : "Notif Off"}</span>
            </Button>
            {userBookingIds.length > 0 && (
              <Link href="/riwayat-antrian" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full h-10 md:h-12 px-4 md:px-6 rounded-xl bg-indigo-600/20 border-indigo-600/30 text-indigo-400 font-bold text-[10px] md:text-xs uppercase gap-2 border-b-4 border-indigo-900 active:translate-y-[2px] active:border-b-0 transition-all">
                  <HistoryIcon size={16} />
                  <span>Riwayat</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* SMART ALERT: Jika ada antrean untuk besok/lusa */}
      {futureBookings.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-xl flex items-start gap-3 shrink-0 shadow-lg border-b-4 border-amber-800">
          <CalendarDays size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Antrean Terjadwal</p>
            <p className="text-xs text-amber-200/80 font-bold leading-tight">
              Anda memiliki antrean <span className="text-white">[{futureBookings[0].booking_number}]</span> untuk tanggal <span className="text-white">{futureBookings[0].booking_date}</span>. Monitoring live akan aktif pada tanggal tersebut.
            </p>
          </div>
        </div>
      )}

      {/* INFO JAM OPERASIONAL TUTUP (Jika > 16:00 WITA) */}
      {new Date().getHours() >= 16 && (
        <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex items-center gap-3 shrink-0 shadow-md border-b-4 border-slate-950">
          <Coffee size={20} className="text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
            Layanan hari ini berakhir. Monitoring dibuka kembali besok pukul 08:00 WITA.
          </p>
        </div>
      )}

      {activeUserBookingsCount > 0 && (
        <div className="bg-indigo-600/10 border-2 border-indigo-600/30 p-3 md:p-4 rounded-xl flex items-center gap-3 shrink-0 shadow-lg shadow-indigo-500/5 border-b-4 border-indigo-900">
          <Star size={20} className="text-indigo-400 fill-indigo-400" />
          <p className="text-xs md:text-sm font-black text-indigo-300 uppercase tracking-tight">
            Layanan Anda Diprioritaskan!
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-2 rounded-xl border border-slate-800 shrink-0 shadow-xl">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600 transition-all border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0"
        >
          <ChevronLeft />
        </Button>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Hal {currentPage} / {totalPages}
        </h3>
        <Button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600 transition-all border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0"
        >
          <ChevronRight />
        </Button>
      </div>

      <div
        className={`flex-1 grid gap-4 md:gap-6 ${
          itemsPerPage === 1 ? "grid-cols-1" : "grid-cols-3"
        } min-h-0 overflow-hidden`}
      >
        {currentServices.map((service) => {
          const current = bookings.find(
            (b) => b.service_id === service.id && b.status === "in_progress"
          );
          const waiting = bookings.filter(
            (b) => b.service_id === service.id && b.status === "waiting"
          );
          const isUserBooking = current && userBookingIdsRef.current.includes(current.id);
          const hasUserBookingInService = userHasActiveBookingInService(service.id);
          const userBookingInService = bookings.find(
            (b) =>
              b.service_id === service.id &&
              userBookingIdsRef.current.includes(b.id) &&
              b.status !== "completed"
          );
          const userSkippedBooking = bookings.find(
            (b) =>
              b.service_id === service.id &&
              userBookingIdsRef.current.includes(b.id) &&
              b.status === "waiting" &&
              skippedInfo[b.id]
          );

          return (
            <Card
              key={service.id}
              className={`bg-slate-900/60 border-slate-800 rounded-2xl md:rounded-[2.5rem] flex flex-col shadow-2xl border-2 transition-all h-full ${
                isUserBooking
                  ? "border-indigo-500 ring-2 ring-indigo-500/50"
                  : userSkippedBooking
                  ? "border-amber-500/40 ring-1 ring-amber-500/20"
                  : hasUserBookingInService
                  ? "border-indigo-600/40 ring-1 ring-indigo-600/20"
                  : "border-transparent"
              }`}
            >
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-3 md:p-5 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Badge variant="outline" className="bg-indigo-600/10 text-indigo-400 border-indigo-500/20 font-black px-2 py-0.5">
                      {service.prefix_code || "A"}
                    </Badge>
                    <h3 className="font-black uppercase text-[10px] text-indigo-400 truncate">
                      {service.name}
                    </h3>
                  </div>
                  {current && <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Antrean Sekarang
                    </p>
                    <h2
                      className={`text-6xl md:text-[8rem] font-black font-mono leading-none ${
                        isUserBooking ? "text-indigo-400" : "text-white"
                      }`}
                    >
                      {current?.booking_number || "---"}
                    </h2>
                  </div>
                  {current && (
                    <MonitorTimer startTime={current.updated_at} durationMinutes={30} />
                  )}
                  <div className="w-full p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex items-center gap-4">
                    <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[8px] font-black text-slate-600 uppercase">Sedang Melayani</p>
                      <p className="text-sm font-black text-white uppercase truncate">
                        {current?.visitor_name || "Menunggu..."}
                      </p>
                    </div>
                  </div>

                  {userBookingInService &&
                    userBookingInService.status === "waiting" &&
                    !userSkippedBooking && (
                      <div className="w-full p-3 bg-indigo-600/10 border border-indigo-600/20 rounded-xl flex justify-between items-center border-b-4 border-indigo-900">
                        <p className="text-[8px] font-black text-indigo-400 uppercase">
                          No. Anda: {userBookingInService.booking_number}
                        </p>
                        <Badge className="bg-indigo-600 text-[10px]">
                          SISA {waiting.findIndex((b: any) => b.id === userBookingInService.id) + 1} LAGI
                        </Badge>
                      </div>
                    )}

                  {userSkippedBooking && skippedInfo[userSkippedBooking.id] && (
                    <div className="w-full space-y-2">
                      <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-left border-b-4 border-amber-800">
                        <SkipForward size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                            Antrean Dilewati
                          </p>
                          <p className="text-[10px] text-amber-300 font-bold">
                            {skippedInfo[userSkippedBooking.id].reason}
                          </p>
                        </div>
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
                      {waiting.length * 30}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}