"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/admin/sidebar";
import { playTTSNotification, VOICE_MALE } from "@/lib/notifications";
import { createLog } from "@/lib/logger"; 
import {
  Volume2,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Calendar,
  SkipForward,
  XCircle,
  UserCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- HELPER NOTIFIKASI WA (FONNTE) ---
const sendWaNotification = (noHp: string, nomorAntrian: string) => {
  if (!noHp) return;
  
  // Format nomor: Ubah 08xxx menjadi 628xxx
  const formattedPhone = noHp.startsWith('0') ? '62' + noHp.slice(1) : noHp;

  fetch('/api/notif-wa', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: formattedPhone,
      message: `Halo! Nomor antrian *${nomorAntrian}* silakan menuju loket DPMPTSP Lombok Barat sekarang. Terima kasih.`,
    }),
  }).catch(err => console.error("Fonnte Error:", err));
};

// --- LOGIKA WAKTU WITA ---
const getWitaDateString = (date: Date = new Date()) => {
  const witaString = date.toLocaleString("en-US", { timeZone: "Asia/Makassar" });
  const d = new Date(witaString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const QueueTimer = ({ startTime }: { startTime: string; durationMinutes?: number }) => {
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
  const [isCalling, setIsCalling] = useState(false);
  
  const [filterDate, setFilterDate] = useState(""); 
  
  const [cancelReason, setCancelReason] = useState<string>("Orang tidak ada di tempat");
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelTargetNumber, setCancelTargetNumber] = useState<string>("");

  const isSwappingRef = useRef(false);

  const [pageService, setPageService] = useState(1);
  const [pageWaiting, setPageWaiting] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);

  const itemsPerService = 6;
  const itemsPerWaiting = 4;
  const itemsPerHistory = 4;

  const isDateToday = useMemo(() => {
    return filterDate === getWitaDateString();
  }, [filterDate]);

  const autoCancelExpiredBookings = useCallback(async () => {
    const today = getWitaDateString();
    const { data: expiredBookings } = await supabase
      .from("bookings")
      .select("id, booking_number")
      .lt("booking_date", today)
      .in("status", ["waiting", "in_progress"]);

    if (expiredBookings && expiredBookings.length > 0) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled", 
          notes: "Sistem: Otomatis dibatalkan (Hari layanan telah berakhir/Orang tidak ada)" 
        })
        .in("id", expiredBookings.map(b => b.id));

      if (!updateError) {
        createLog('SYSTEM', `Auto-cancel ${expiredBookings.length} antrean kadaluarsa`, 'warning');
        fetchData();
      }
    }
  }, [supabase]);
  
  useEffect(() => {
    const handler = () => {};
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  useEffect(() => {
    const today = getWitaDateString();
    setFilterDate(today);
    autoCancelExpiredBookings();
  }, [autoCancelExpiredBookings]);

  const fetchData = useCallback(async () => {
    if (isSwappingRef.current || !filterDate) return;

    const [bookingRes, serviceRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(name, prefix_code)")
        .eq("booking_date", filterDate)
        .order("booking_time", { ascending: true }),
      supabase.from("services").select("*").order("name"),
    ]);

    if (isSwappingRef.current) return;

    const data = bookingRes.data || [];
    setBookings(data);

    const sortedServices = (serviceRes.data || []).sort((a: any, b: any) => {
      const countA = data.filter((bk) => bk.service_id === a.id && bk.status !== "completed").length;
      const countB = data.filter((bk) => bk.service_id === b.id && bk.status !== "completed").length;
      return countB - countA;
    });
    setServices(sortedServices);

    setSelectedServiceId((prev) => {
      if (!prev && sortedServices.length > 0) return sortedServices[0].id;
      return prev;
    });
  }, [filterDate, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("admin_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        if (!isSwappingRef.current) fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);
  
  const panggilSuara = async (nomor: string) => {
    await playTTSNotification(`Nomor antrean ${nomor}, silakan menuju loket.`, VOICE_MALE);
  };
  
  const activeQueue = useMemo(
    () => bookings.find((b) => b.status === "in_progress" && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const waitingOnly = useMemo(
    () => bookings.filter((b) => b.status === "waiting" && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const handleAction = async (type: "NEXT" | "SELESAI" | "ULANG" | "SWAP", targetId?: string) => {
    if (!isDateToday) return toast.error("Hanya bisa memproses antrean hari ini!");
    if (!selectedServiceId) return toast.warning("Pilih jenis layanan terlebih dahulu");

    try {
      if (type === "NEXT") {
        const next = waitingOnly[0];
        if (!next) return toast.info("Tidak ada antrean menunggu");
        if (activeQueue) return toast.error("Selesaikan antrean aktif dulu!");
        
        setIsCalling(true);
        try {
          const { error } = await supabase.from("bookings").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", next.id);
          if (!error) {
            createLog('CALL', `Memanggil antrean ${next.booking_number}`);
            
            // KIRIM WA (Asinkron agar tidak membebani suara)
            sendWaNotification(next.visitor_phone, next.booking_number);

            await panggilSuara(next.booking_number);
            await fetchData();
          }
        } finally {
          setIsCalling(false);
        }

      } else if (type === "SELESAI" && activeQueue) {
        const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", activeQueue.id);
        if (!error) {
          createLog('COMPLETE', `Antrean ${activeQueue.booking_number} selesai`);
          await fetchData();
        }
      } else if (type === "ULANG" && activeQueue) {
        setIsCalling(true);
        try {
          const { error } = await supabase
            .from("bookings")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", activeQueue.id);
            
          if (!error) {
            createLog('CALL', `Panggil ulang antrean ${activeQueue.booking_number}`);
            await panggilSuara(activeQueue.booking_number);
            toast.info(`Panggil ulang ${activeQueue.booking_number} terkirim`);
          }
        } finally {
          setIsCalling(false);
        }

      } else if (type === "SWAP" && targetId && activeQueue) {
        const target = bookings.find((b) => b.id === targetId);
        if (!target) return;
        isSwappingRef.current = true;
        setBookings((prev) => prev.map((b) => {
          if (b.id === activeQueue.id) return { ...b, status: "waiting" };
          if (b.id === target.id) return { ...b, status: "in_progress" };
          return b;
        }));
        setIsSkipModalOpen(false);
        const [res1, res2] = await Promise.all([
          supabase.from("bookings").update({ status: "waiting", updated_at: new Date().toISOString() }).eq("id", activeQueue.id),
          supabase.from("bookings").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", target.id),
        ]);
        if (res1.error || res2.error) {
          throw new Error(res1.error?.message || res2.error?.message || "Gagal swap antrean");
        }

        createLog('SYSTEM', `Skip antrean ${activeQueue.booking_number} ke ${target.booking_number}`);
        
        // KIRIM WA UNTUK TARGET BARU
        sendWaNotification(target.visitor_phone, target.booking_number);

        await panggilSuara(target.booking_number);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        isSwappingRef.current = false;
        await fetchData();
      }
    } catch (error: any) {
      createLog('ERROR', `Gagal aksi ${type}: ${error.message}`, 'error');
      toast.error(`Gagal: ${error?.message}`);
      isSwappingRef.current = false;
      setIsCalling(false);
      await fetchData();
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    try {
      const { error } = await supabase.from("bookings").update({ status: "cancelled", notes: cancelReason }).eq("id", cancelTargetId);
      if (!error) {
        createLog('CANCEL', `Batal antrean ${cancelTargetNumber} alasan: ${cancelReason}`, 'warning');
        toast.error(`Antrean ${cancelTargetNumber} dibatalkan.`);
        setIsCancelModalOpen(false);
        await fetchData();
      }
    } catch (error: any) {
      createLog('ERROR', `Gagal batal antrean: ${error.message}`, 'error');
      toast.error(`Gagal: ${error?.message}`);
    }
  };

  const waitingListDisplay = useMemo(() => {
    return bookings
      .filter((b) => (b.status === "waiting" || b.status === "in_progress") && b.service_id === selectedServiceId)
      .sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        return a.booking_time.localeCompare(b.booking_time);
      });
  }, [bookings, selectedServiceId]);

  const historyList = useMemo(
    () => bookings.filter((b) => b.service_id === selectedServiceId).slice().reverse(),
    [bookings, selectedServiceId]
  );

  const paginatedServices = services.slice((pageService - 1) * itemsPerService, pageService * itemsPerService);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 flex flex-col h-full relative">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="text-indigo-400" size={24} />
            <div className="relative flex items-center gap-3">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`bg-slate-900 border rounded-xl px-4 py-2 text-sm font-black focus:outline-none transition-all [color-scheme:dark] ${
                  isDateToday ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"
                }`}
              />
              {isDateToday ? (
                <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[11px] font-black uppercase px-3 py-2 rounded-lg shadow-lg shadow-emerald-500/5">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse mr-2" />
                  Jadwal Hari Ini
                </Badge>
              ) : (
                filterDate && (
                  <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-500 text-[11px] font-black animate-pulse px-3 py-2">
                    MODE LIHAT DATA (READ-ONLY)
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-2 px-4 rounded-2xl">
              <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Alasan Batal:</span>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-sm font-bold text-indigo-400 w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Orang tidak ada di tempat" className="text-sm font-bold">Orang tidak ada</SelectItem>
                  <SelectItem value="Dokumen tidak lengkap" className="text-sm font-bold">Dokumen kurang</SelectItem>
                  <SelectItem value="Minta reschedule" className="text-sm font-bold">Minta jadwal ulang</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <section className={`bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-2xl flex items-center justify-between gap-6 shrink-0 z-10 transition-opacity ${!isDateToday ? "opacity-60" : "opacity-100"}`}>
          <div className="flex items-center gap-5">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border ${isDateToday ? "bg-indigo-600/20 border-indigo-500/30" : "bg-slate-800/20 border-slate-700/30"}`}>
              <Play className={isDateToday ? "text-indigo-400 fill-indigo-400" : "text-slate-600 fill-slate-600"} size={28} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {services.find((s) => s.id === selectedServiceId)?.name}
                {activeQueue && <span className="text-indigo-400 ml-2 font-mono text-sm">| {activeQueue.booking_time}</span>}
              </p>
              <h1 className="text-6xl font-black text-white font-mono leading-none tracking-tighter">{activeQueue?.booking_number || "---"}</h1>
            </div>
          </div>
          {activeQueue && <QueueTimer startTime={activeQueue.updated_at} />}
          <div className="flex gap-2">
            {!isDateToday ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle size={20} className="text-amber-500" />
                <span className="text-xs font-black uppercase text-amber-500 tracking-wider">Bukan Jadwal Hari Ini</span>
              </div>
            ) : activeQueue ? (
              <>
                <Button 
                  disabled={isCalling} 
                  onClick={() => handleAction("ULANG")} 
                  className="h-14 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border-b-4 border-slate-950 font-black uppercase text-xs gap-2 active:translate-y-[2px] active:border-b-0 transition-all"
                >
                  {isCalling ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />} 
                  Panggil Ulang
                </Button>
                <Dialog open={isSkipModalOpen} onOpenChange={setIsSkipModalOpen}>
                  <DialogTrigger asChild><Button className="h-14 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-xl border-b-4 border-amber-800 font-black uppercase text-xs gap-2 active:translate-y-[2px] active:border-b-0 transition-all"><SkipForward size={18} /> Skip Antrean</Button></DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2rem] max-w-md p-6">
                    <DialogHeader><DialogTitle className="text-base font-black uppercase text-amber-500 tracking-widest flex items-center gap-2"><UserCheck size={20} /> Pilih Pengganti {activeQueue.booking_number}</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2">
                      {waitingOnly.length === 0 ? <p className="text-xs text-slate-500 italic text-center py-10 uppercase font-black">Tidak ada antrean menunggu</p> : 
                        waitingOnly.map((b) => (
                          <button key={b.id} onClick={() => handleAction("SWAP", b.id)} className="w-full p-4 bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 rounded-2xl flex justify-between items-center transition-all group">
                            <div className="text-left"><p className="text-2xl font-mono font-black text-white group-hover:text-indigo-400">{b.booking_number}</p><p className="text-xs text-slate-500 font-black uppercase tracking-widest">{b.visitor_name} | {b.booking_time}</p></div>
                            <div className="bg-slate-900 p-2 rounded-lg group-hover:bg-indigo-600/30"><UserCheck className="text-slate-600 group-hover:text-indigo-400" size={24} /></div>
                          </button>
                        ))
                      }
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={() => handleAction("SELESAI")} className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border-b-4 border-emerald-800 font-black uppercase text-xs gap-2 active:translate-y-[2px] active:border-b-0 transition-all"><CheckCircle2 size={18} /> Selesai</Button>
              </>
            ) : (
              <Button 
                disabled={isCalling}
                onClick={() => handleAction("NEXT")} 
                className="h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border-b-4 border-indigo-800 font-black uppercase text-xl gap-3 active:translate-y-[2px] active:border-b-0 transition-all shadow-xl"
              >
                {isCalling ? <Loader2 className="animate-spin" size={24} /> : <Volume2 size={24} />} 
                <span>{activeQueue ? "Panggil Berikutnya" : "Panggil Antrean"}</span>
              </Button>
            )}
          </div>
        </section>

        <div className="flex items-center gap-3 shrink-0 px-1">
          <Button disabled={pageService === 1} onClick={() => setPageService((p) => p - 1)} className="h-12 w-12 bg-slate-900 border border-slate-800 rounded-xl hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronLeft size={20}/></Button>
          <div className="flex-1 grid grid-cols-6 gap-3">
            {paginatedServices.map((s) => {
              const count = bookings.filter((b) => b.service_id === s.id && (b.status === "waiting" || b.status === "in_progress")).length;
              return (
                <button key={s.id} onClick={() => setSelectedServiceId(s.id)} className={`relative h-14 rounded-xl font-black uppercase text-[11px] border transition-all px-3 ${selectedServiceId === s.id ? "bg-indigo-600 border-indigo-500 text-white scale-105 z-20 shadow-lg border-b-4 border-indigo-800" : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"}`}>
                  <span className="truncate block">{s.name}</span>
                  {count > 0 && <Badge className="absolute -top-2 -right-2 bg-red-600 text-white font-black border-2 border-[#020617] px-2.5 py-1 rounded-full text-xs">{count}</Badge>}
                </button>
              );
            })}
          </div>
          <Button disabled={pageService * itemsPerService >= services.length} onClick={() => setPageService((p) => p + 1)} className="h-12 w-12 bg-slate-900 border border-slate-800 rounded-xl hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronRight size={20}/></Button>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col shadow-xl overflow-hidden">
            <div className="h-14 border-b border-slate-800 bg-indigo-600/5 flex justify-between items-center px-6 shrink-0">
              <h3 className="font-black uppercase text-sm text-indigo-400 tracking-wider">Daftar Tunggu</h3>
              <Badge className="bg-slate-950 text-indigo-400 border-none text-xs px-3 py-1 font-black">{waitingListDisplay.length} Antrean</Badge>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left table-fixed">
                <thead className="bg-slate-950 text-xs font-black uppercase text-slate-500 border-b border-slate-800 sticky top-0 z-10">
                  <tr className="h-12">
                    <th className="px-5 w-24">Jam</th>
                    <th className="px-5 w-36">No Antrean</th>
                    <th className="px-5">Nama</th>
                    <th className="px-5 w-32 text-center">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingListDisplay.slice((pageWaiting - 1) * itemsPerWaiting, pageWaiting * itemsPerWaiting).map((b) => (
                    <tr key={b.id} className={`h-[75px] border-b border-slate-800/50 ${b.status === "in_progress" ? "bg-indigo-600/10" : ""}`}>
                      <td className="px-5">
                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-sm px-2 py-1">
                          {b.booking_time}
                        </Badge>
                      </td>
                      <td className="px-5 font-mono font-black text-white text-2xl">{b.booking_number}</td>
                      <td className="px-5 text-sm font-bold uppercase text-slate-400">
                        <div className="truncate">{b.visitor_name}</div>
                        <div className="h-4" /> 
                      </td>
                      <td className="px-5 text-right">
                        <Button 
                          disabled={!isDateToday}
                          onClick={() => {
                            setCancelTargetId(b.id); 
                            setCancelTargetNumber(b.booking_number); 
                            setIsCancelModalOpen(true);
                          }} 
                          className="h-10 px-4 !bg-red-600 !text-white border-b-4 border-red-900 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ml-auto active:translate-y-[2px] active:border-b-0 transition-all disabled:opacity-20"
                        >
                          <XCircle size={16} />
                          <span>Batal</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-14 border-t border-slate-800 flex justify-between bg-slate-950/50 items-center px-6 shrink-0">
              <Button disabled={pageWaiting === 1} onClick={() => setPageWaiting((p) => p - 1)} className="h-9 w-9 bg-slate-900 rounded-lg border border-slate-800 hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronLeft size={20} /></Button>
              <span className="text-sm font-black text-slate-600 uppercase">Hal {pageWaiting}</span>
              <Button disabled={pageWaiting * itemsPerWaiting >= waitingListDisplay.length} onClick={() => setPageWaiting((p) => p + 1)} className="h-9 w-9 bg-slate-900 rounded-lg border border-slate-800 hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronRight size={20} /></Button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col shadow-xl overflow-hidden">
            <div className="h-14 border-b border-slate-800 bg-slate-950 flex items-center px-6 shrink-0">
              <h3 className="font-black uppercase text-sm text-slate-500 tracking-wider">Riwayat Layanan</h3>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left table-fixed">
                <thead className="bg-slate-950 text-xs font-black uppercase text-slate-500 border-b border-slate-800 sticky top-0 z-10">
                  <tr className="h-12">
                    <th className="px-5 w-44">No & Jam</th>
                    <th className="px-5">Nama Pengunjung</th>
                    <th className="px-5 w-32 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.slice((pageHistory - 1) * itemsPerHistory, pageHistory * itemsPerHistory).map((b) => (
                    <tr key={b.id} className="h-[75px] border-b border-slate-800/50 hover:bg-white/[0.01]">
                      <td className="px-5">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-slate-300 text-xl">{b.booking_number}</p>
                          <span className="text-[10px] text-slate-600 font-bold">@ {b.booking_time}</span>
                        </div>
                      </td>
                      <td className="px-5">
                        <p className="text-sm text-slate-400 font-bold uppercase truncate">{b.visitor_name}</p>
                        {b.status === "cancelled" ? (
                          <p className="text-[9px] text-red-500 font-black italic uppercase truncate leading-none mt-1">
                            Ket: {b.notes || b.cancel_reason || "Tanpa alasan"}
                          </p>
                        ) : (
                            <div className="h-4" /> 
                        )}
                      </td>
                      <td className="px-5 text-center">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-black border-none px-3 py-1.5 ${
                            b.status === "completed" 
                              ? "text-emerald-500 bg-emerald-500/10" 
                              : b.status === "cancelled" 
                              ? "text-red-500 bg-red-500/10" 
                              : b.status === "in_progress"
                              ? "text-indigo-400 bg-indigo-500/10"
                              : "text-amber-500 bg-amber-500/10" 
                          }`}
                        >
                          {b.status === "in_progress" ? "DILAYANI" : b.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-14 border-t border-slate-800 flex justify-between bg-slate-950/50 items-center px-6 shrink-0">
              <Button disabled={pageHistory === 1} onClick={() => setPageHistory((p) => p - 1)} className="h-9 w-9 bg-slate-900 rounded-lg border border-slate-800 hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronLeft size={20} /></Button>
              <span className="text-sm font-black text-slate-600 uppercase">Hal {pageHistory}</span>
              <Button disabled={pageHistory * itemsPerHistory >= historyList.length} onClick={() => setPageHistory((p) => p + 1)} className="h-9 w-9 bg-slate-900 rounded-lg border border-slate-800 hover:bg-indigo-600 transition-all active:translate-y-[2px]"><ChevronRight size={20} /></Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2rem] max-w-sm p-6 shadow-2xl">
          <DialogHeader><div className="flex flex-col items-center gap-3 mb-2"><div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20"><AlertTriangle size={32} className="text-red-400" /></div><DialogTitle className="text-xl font-black uppercase tracking-widest text-white text-center">Batalkan Antrean?</DialogTitle><DialogDescription className="text-center text-sm text-slate-500 font-medium leading-relaxed italic">Antrean <span className="text-white font-black font-mono">{cancelTargetNumber}</span> akan dibatalkan.</DialogDescription></div></DialogHeader>
          <DialogFooter className="flex flex-col gap-3 mt-4">
            <Button onClick={handleConfirmCancel} className="h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-red-600/20 gap-2 border-b-4 border-red-800 active:translate-y-[2px] active:border-b-0 transition-all"><XCircle size={18} /> Ya, Batalkan</Button>
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="h-12 rounded-2xl font-black text-sm text-slate-400 hover:text-white hover:bg-slate-800">Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

