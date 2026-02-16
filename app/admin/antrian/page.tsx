"use client";
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/admin/sidebar";
import {
  Volume2,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const QueueTimer = ({ startTime }: { startTime: string; durationMinutes?: number; }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const FIXED_DURATION = 30; 

  useEffect(() => {
    const calculate = () => {
      if (!startTime) return;
      const start = new Date(startTime).getTime();
      const end = start + FIXED_DURATION * 60000;
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (timeLeft === null) return <div className="text-2xl font-mono text-slate-700">--:--</div>;
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  return (
    <div className="flex items-center gap-2 text-4xl font-black font-mono text-emerald-400 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
      <Clock size={24} /> {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
    </div>
  );
};

export default function ManajemenAntrean() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [pageService, setPageService] = useState(1);
  const [pageWaiting, setPageWaiting] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);

  const itemsPerService = 6;
  const itemsPerWaiting = 5;
  const itemsPerHistory = 3;

  const fetchData = async () => {
    const [bookingRes, serviceRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(name, prefix_code)") // MODIFIKASI: Ambil prefix_code
        .eq("booking_date", filterDate)
        .order("booking_time", { ascending: true }),
      supabase.from("services").select("*").order("name"),
    ]);
    
    setBookings(bookingRes.data || []);
    const sortedServices = (serviceRes.data || []).sort((a, b) => {
        const countA = (bookingRes.data || []).filter(bk => bk.service_id === a.id && bk.status !== "completed").length;
        const countB = (bookingRes.data || []).filter(bk => bk.service_id === b.id && bk.status !== "completed").length;
        return countB - countA;
    });
    setServices(sortedServices);

    if (!selectedServiceId && sortedServices.length > 0) {
      setSelectedServiceId(sortedServices[0].id);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("admin_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedServiceId, filterDate]);

  const panggilSuara = (nomor: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(`Nomor antrean ${nomor.split("").join(" ")}, silakan menuju loket.`);
    utterance.lang = "id-ID"; utterance.rate = 0.8; synth.speak(utterance);
  };

  const activeQueue = useMemo(() =>
      bookings.find(b => b.status === "in_progress" && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const handleAction = async (type: "NEXT" | "SELESAI" | "ULANG") => {
    if (!selectedServiceId) return toast.warning("Pilih jenis layanan terlebih dahulu");

    if (type === "NEXT") {
      // MODIFIKASI: Ambil antrean menunggu khusus di layanan yang dipilih hari ini
      const next = bookings.find(b => b.status === "waiting" && b.service_id === selectedServiceId);
      
      if (!next) return toast.info("Tidak ada antrean menunggu untuk hari ini");
      if (activeQueue) return toast.error("Selesaikan antrean aktif dulu!");

      await supabase.from("bookings").update({ 
        status: "in_progress", 
        updated_at: new Date().toISOString() 
      }).eq("id", next.id);

      panggilSuara(next.booking_number);
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } else if (type === "SELESAI" && activeQueue) {
      await supabase.from("bookings").update({ status: "completed" }).eq("id", activeQueue.id);
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } else if (type === "ULANG" && activeQueue) {
      await supabase.from("bookings").update({ updated_at: new Date().toISOString() }).eq("id", activeQueue.id);
      panggilSuara(activeQueue.booking_number);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    fetchData();
  };

  const waitingList = useMemo(() =>
      bookings.filter(b => (b.status === "waiting" || b.status === "in_progress") && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const historyList = useMemo(() => 
    bookings.filter((b) => b.service_id === selectedServiceId).slice().reverse(),
    [bookings, selectedServiceId]
  );

  const paginatedServices = services.slice((pageService - 1) * itemsPerService, pageService * itemsPerService);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 flex flex-col h-full relative">
        
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="text-indigo-400" size={20} />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase text-indigo-400 focus:outline-none"
            />
          </div>
          <Badge variant="outline" className="border-slate-800 text-slate-500 text-[10px] font-black uppercase px-4 py-1.5 rounded-full">
            Mode: Time-Slot Booking (30m)
          </Badge>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-2xl flex items-center justify-between gap-6 shrink-0 z-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Play className="text-indigo-400 fill-indigo-400" size={28} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {services.find((s) => s.id === selectedServiceId)?.name || "Pilih Layanan"} 
                {activeQueue && <span className="text-indigo-400">• JADWAL: {activeQueue.booking_time}</span>}
              </p>
              <h1 className="text-5xl font-black text-white font-mono leading-none">
                {activeQueue?.booking_number || "---"}
              </h1>
            </div>
          </div>

          {activeQueue && (
            <QueueTimer
              startTime={activeQueue.updated_at}
              durationMinutes={30}
            />
          )}

          <div className="flex gap-2">
            {activeQueue ? (
              <>
                <Button onClick={() => handleAction("ULANG")} className="h-14 px-5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 font-black uppercase text-[10px] gap-2">
                  <RotateCcw size={16} /> Panggil Ulang
                </Button>
                <Button onClick={() => handleAction("SELESAI")} className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] gap-2 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={16} /> Selesai
                </Button>
              </>
            ) : (
              <Button onClick={() => handleAction("NEXT")} className="h-14 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] gap-3 shadow-xl">
                <Volume2 size={18} /> Panggil Berikutnya
              </Button>
            )}
          </div>
        </section>

        <div className="flex items-center gap-3 shrink-0 px-1">
          <Button disabled={pageService === 1} onClick={() => setPageService((p) => p - 1)} variant="outline" className="h-12 w-12 bg-slate-900 border-slate-800 rounded-xl"><ChevronLeft /></Button>
          <div className="flex-1 grid grid-cols-6 gap-3">
            {paginatedServices.map((s) => {
              const count = bookings.filter(b => b.service_id === s.id && (b.status === "waiting" || b.status === "in_progress")).length;
              return (
                <button key={s.id} onClick={() => { setSelectedServiceId(s.id); setPageWaiting(1); setPageHistory(1); }}
                  className={`relative h-12 rounded-xl font-black uppercase text-[9px] border transition-all px-3 ${selectedServiceId === s.id ? "bg-indigo-600 border-indigo-500 text-white scale-105 z-20" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                  <span className="truncate block">{s.name}</span>
                  {count > 0 && <Badge className="absolute -top-2 -right-2 bg-red-600 text-white font-black border-2 border-[#020617] px-2 rounded-full">{count}</Badge>}
                </button>
              );
            })}
          </div>
          <Button disabled={pageService * itemsPerService >= services.length} onClick={() => setPageService((p) => p + 1)} variant="outline" className="h-12 w-12 bg-slate-900 border-slate-800 rounded-xl"><ChevronRight /></Button>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-indigo-600/5 flex justify-between items-center">
              <h3 className="font-black uppercase text-[10px] text-indigo-400">Daftar Tunggu {filterDate === new Date().toISOString().split('T')[0] ? "Hari Ini" : ""}</h3>
              <Badge className="bg-slate-950 text-indigo-400 border-none text-[9px]">{waitingList.length} Antrean</Badge>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Jam</th>
                    <th className="p-4">No Antrean</th>
                    <th className="p-4">Nama</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingList.slice((pageWaiting - 1) * itemsPerWaiting, pageWaiting * itemsPerWaiting).map((b) => (
                    <tr key={b.id} className={`border-b border-slate-800/50 ${b.status === "in_progress" ? "bg-indigo-600/10" : ""}`}>
                      <td className="p-4"><Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono">{b.booking_time}</Badge></td>
                      <td className="p-4 font-mono font-black text-white text-lg">{b.booking_number}</td>
                      <td className="p-4 text-[10px] font-bold uppercase text-slate-400 truncate max-w-[120px]">{b.visitor_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-between items-center bg-slate-950/50">
              <Button disabled={pageWaiting === 1} onClick={() => setPageWaiting((p) => p - 1)} size="sm" className="h-8 w-8 rounded-lg bg-slate-900 border-slate-800"><ChevronLeft size={14} /></Button>
              <span className="text-[9px] font-black text-slate-600">HAL {pageWaiting}</span>
              <Button disabled={pageWaiting * itemsPerWaiting >= waitingList.length} onClick={() => setPageWaiting((p) => p + 1)} size="sm" className="h-8 w-8 rounded-lg bg-slate-900 border-slate-800"><ChevronRight size={14} /></Button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black uppercase text-[10px] text-slate-500">Riwayat Layanan</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">No & Jam</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.slice((pageHistory - 1) * itemsPerHistory, pageHistory * itemsPerHistory).map((b) => (
                    <tr key={b.id} className="border-b border-slate-800/50 hover:bg-white/[0.01]">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-slate-300">{b.booking_number}</p>
                          <span className="text-[8px] text-slate-600 font-black">@ {b.booking_time}</span>
                        </div>
                        <p className="text-[9px] text-slate-600 uppercase font-bold truncate max-w-[150px]">{b.visitor_name}</p>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`text-[8px] font-black border-none ${b.status === "completed" ? "text-emerald-500 bg-emerald-500/10" : "text-slate-600 bg-slate-800/50"}`}>
                          {b.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-between items-center bg-slate-950/50">
              <Button disabled={pageHistory === 1} onClick={() => setPageHistory((p) => p - 1)} size="sm" className="h-8 w-8 rounded-lg bg-slate-900 border-slate-800"><ChevronLeft size={14} /></Button>
              <span className="text-[9px] font-black text-slate-600 uppercase">HAL {pageHistory}</span>
              <Button disabled={pageHistory * itemsPerHistory >= historyList.length} onClick={() => setPageHistory((p) => p - 1)} size="sm" className="h-8 w-8 rounded-lg bg-slate-900 border-slate-800"><ChevronRight size={14} /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}