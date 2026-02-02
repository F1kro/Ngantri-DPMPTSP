"use client";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  User,
  Ticket,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Komponen Timer Mandiri agar sinkron dengan Admin
const MonitorTimer = ({
  startTime,
  durationMinutes,
}: {
  startTime: string;
  durationMinutes: number;
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    const calculate = () => {
      const start = new Date(startTime).getTime();
      const end = start + durationMinutes * 60000;
      const diff = Math.max(0, Math.floor((end - new Date().getTime()) / 1000));
      setTimeLeft(diff);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes]);

  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;

  return (
    <div
      className={`flex items-center gap-2 font-mono font-black text-3xl md:text-5xl ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-emerald-400"}`}
    >
      <Clock size={32} />
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

  // Mengatur jumlah tampilan berdasarkan ukuran layar
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

    // Sorting: Layanan dengan antrean terbanyak muncul di halaman awal
    const sortedServices = (serviceRes.data || []).sort((a, b) => {
      const countA = allBookings.filter(
        (bk) => bk.service_id === a.id && bk.status !== "completed",
      ).length;
      const countB = allBookings.filter(
        (bk) => bk.service_id === b.id && bk.status !== "completed",
      ).length;
      return countB - countA;
    });
    setServices(sortedServices);

    // Auto-Focus: Arahkan ke layanan yang terakhir kali di-booking
    if (allBookings.length > 0 && currentPage === 1) {
      const lastBooking = allBookings[allBookings.length - 1];
      const serviceIndex = sortedServices.findIndex(
        (s) => s.id === lastBooking.service_id,
      );
      if (serviceIndex !== -1) {
        const targetPage =
          Math.floor(serviceIndex / (window.innerWidth < 768 ? 1 : 3)) + 1;
        setCurrentPage(targetPage);
      }
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("user-live-monitor")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Realtime Update User:", payload);
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalPages = Math.ceil(services.length / (itemsPerPage || 1));
  const currentServices = services.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <main className="min-h-screen w-full bg-[#020617] text-slate-100 font-sans p-4 md:p-10 flex flex-col gap-6 overflow-hidden">
      {/* HEADER SECTION */}
      <header className="flex items-center justify-between bg-slate-900/50 p-5 rounded-[2rem] border border-slate-800 backdrop-blur-xl shrink-0 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
            <Ticket size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white">
              Cek Antrean
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
              DPMPTSP Real-time Monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[8px] font-black text-emerald-500 uppercase">
            Live Update
          </p>
        </div>
      </header>

      {/* PAGINATION CONTROLLER */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-2 rounded-[1.5rem] border border-slate-800 shrink-0 shadow-xl">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="h-12 w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600 text-white transition-all shadow-inner"
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="text-center">
          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
            Pilih Kategori Layanan
          </p>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase">
            Halaman {currentPage} / {totalPages}
          </h3>
        </div>
        <Button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="h-12 w-12 rounded-xl bg-slate-800 border-slate-700 hover:bg-indigo-600 text-white transition-all shadow-inner"
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* SERVICE CARDS DISPLAY */}
      <div
        className={`flex-1 grid gap-6 ${itemsPerPage === 1 ? "grid-cols-1" : "grid-cols-3"} min-h-0 overflow-hidden`}
      >
        {currentServices.map((service) => {
          const current = bookings.find(
            (b) => b.service_id === service.id && b.status === "in_progress",
          );
          const waiting = bookings.filter(
            (b) => b.service_id === service.id && b.status === "waiting",
          );

          return (
            <Card
              key={service.id}
              className="bg-slate-900/60 border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-2 border-transparent transition-all h-full relative group"
            >
              <CardContent className="p-0 flex flex-col h-full">
                {/* Judul Layanan */}
                <div className="p-5 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0">
                  <h3 className="font-black uppercase text-[10px] text-indigo-400 truncate pr-4">
                    {service.name}
                  </h3>
                  {current && (
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                  )}
                </div>

                {/* Konten Utama */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      Antrean Sekarang
                    </p>
                    <h2 className="text-[7.5rem] md:text-[9.5rem] font-black font-mono tracking-tighter text-white leading-none drop-shadow-2xl">
                      {current?.booking_number || "---"}
                    </h2>
                  </div>

                  {current && (
                    <MonitorTimer
                      startTime={current.updated_at}
                      durationMinutes={service.estimated_duration || 15}
                    />
                  )}

                  {/* Info Petugas */}
                  <div className="w-full p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex items-center gap-4">
                    <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                      <User size={18} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        Sedang Melayani
                      </p>
                      <p className="text-sm font-black text-white uppercase truncate">
                        {current?.visitor_name || "Menunggu Antrean..."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Statistik */}
                <div className="p-6 bg-slate-950/50 border-t border-slate-800 grid grid-cols-2 gap-4 shrink-0 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                      Sisa Menunggu
                    </p>
                    <p className="text-3xl font-black text-white font-mono leading-none">
                      {waiting.length}
                    </p>
                  </div>
                  <div className="border-l border-slate-800 space-y-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                      Estimasi Waktu
                    </p>
                    <p className="text-3xl font-black text-emerald-400 font-mono leading-none">
                      {waiting.length * (service.estimated_duration || 15)}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PERSONAL INFO FOOTER */}
      <div className="bg-indigo-600/10 border border-indigo-600/20 p-5 rounded-[1.5rem] flex items-center gap-4 shrink-0 shadow-lg mb-2">
        <div className="h-11 w-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/30">
          <Activity size={22} />
        </div>
        <p className="text-[10px] md:text-xs font-medium text-slate-400 leading-tight italic">
          Nomor antrean diperbarui secara otomatis. Silakan segera menuju loket
          pelayanan jika nomor Anda sudah mendekati giliran. Terima kasih.
        </p>
      </div>
    </main>
  );
}
