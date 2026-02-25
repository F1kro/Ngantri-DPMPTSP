"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  SkipForward,
  XCircle,
  UserCheck,
  AlertTriangle,
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
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [cancelReason, setCancelReason] = useState<string>("Orang tidak ada di tempat");
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelTargetNumber, setCancelTargetNumber] = useState<string>("");

  // ✅ FIX: Gunakan useRef agar nilai selalu fresh di dalam closure manapun
  const isSwappingRef = useRef(false);

  const [pageService, setPageService] = useState(1);
  const [pageWaiting, setPageWaiting] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);

  const itemsPerService = 6;
  const itemsPerWaiting = 5;
  const itemsPerHistory = 3;

  // ✅ FIX: fetchData menggunakan useCallback agar bisa dipakai di dalam realtime handler
  //    tanpa masalah stale closure
  const fetchData = useCallback(async () => {
    // Cek ref langsung — selalu fresh, tidak pernah stale
    if (isSwappingRef.current) return;

    const [bookingRes, serviceRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services(name, prefix_code)")
        .eq("booking_date", filterDate)
        .order("booking_time", { ascending: true }),
      supabase.from("services").select("*").order("name"),
    ]);

    // ✅ FIX: Cek lagi setelah async selesai — bisa saja swap terjadi saat fetch berlangsung
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
  }, [filterDate]); // hanya bergantung pada filterDate

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("admin_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        // ✅ FIX: Langsung cek ref — tidak perlu setState trick yang menyebabkan stale closure
        if (!isSwappingRef.current) {
          fetchData();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const panggilSuara = (nomor: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(
      `Nomor antrean ${nomor.split("").join(" ")}, silakan menuju loket.`
    );
    utterance.lang = "id-ID";
    utterance.rate = 0.8;
    synth.speak(utterance);
  };

  const activeQueue = useMemo(
    () => bookings.find((b) => b.status === "in_progress" && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const waitingOnly = useMemo(
    () => bookings.filter((b) => b.status === "waiting" && b.service_id === selectedServiceId),
    [bookings, selectedServiceId]
  );

  const handleAction = async (
    type: "NEXT" | "SELESAI" | "ULANG" | "CANCEL" | "SWAP",
    targetId?: string
  ) => {
    if (!selectedServiceId) return toast.warning("Pilih jenis layanan terlebih dahulu");

    try {
      if (type === "NEXT") {
        const next = waitingOnly[0];
        if (!next) return toast.info("Tidak ada antrean menunggu");
        if (activeQueue) return toast.error("Selesaikan antrean aktif dulu!");
        await supabase
          .from("bookings")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", next.id);
        panggilSuara(next.booking_number);
        await fetchData();

      } else if (type === "SELESAI" && activeQueue) {
        await supabase.from("bookings").update({ status: "completed" }).eq("id", activeQueue.id);
        await fetchData();

      } else if (type === "ULANG" && activeQueue) {
        await supabase
          .from("bookings")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeQueue.id);
        panggilSuara(activeQueue.booking_number);
        await fetchData();

      } else if (type === "SWAP" && targetId && activeQueue) {
        const target = bookings.find((b) => b.id === targetId);
        if (!target) return;

        // Aktifkan lock via REF
        isSwappingRef.current = true;

        // Optimistic update UI — HANYA tukar STATUS, jangan sentuh booking_time
        // karena ada constraint unique_slot_global_time yang melarang duplikat
        setBookings((prev) =>
          prev.map((b) => {
            if (b.id === activeQueue.id) return { ...b, status: "waiting" };
            if (b.id === target.id) return { ...b, status: "in_progress" };
            return b;
          })
        );

        setIsSkipModalOpen(false);

        // Update DB — HANYA tukar status, TIDAK tukar booking_time
        const [res1, res2] = await Promise.all([
          supabase
            .from("bookings")
            .update({
              status: "waiting",
              updated_at: new Date().toISOString(),
            })
            .eq("id", activeQueue.id),
          supabase
            .from("bookings")
            .update({
              status: "in_progress",
              updated_at: new Date().toISOString(),
            })
            .eq("id", target.id),
        ]);

        if (res1.error || res2.error) {
          throw new Error(res1.error?.message || res2.error?.message);
        }

        toast.success(`Berhasil skip ke ${target.booking_number}`);
        panggilSuara(target.booking_number);

        // Tunggu broadcast DB mereda, lalu fetch fresh
        await new Promise((resolve) => setTimeout(resolve, 2000));
        isSwappingRef.current = false;
        await fetchData();

      } else if (type === "CANCEL" && targetId) {
        // Tampilkan dialog konfirmasi, eksekusi dilakukan di handleConfirmCancel
        const target = bookings.find((b) => b.id === targetId);
        setCancelTargetId(targetId);
        setCancelTargetNumber(target?.booking_number || "");
        setIsCancelModalOpen(true);
        return; // jangan fetchData dulu, tunggu konfirmasi
      }
    } catch (error: any) {
      console.error("❌ handleAction error:", error);
      console.error("❌ error message:", error?.message);
      console.error("❌ error details:", JSON.stringify(error, null, 2));
      toast.error(`Gagal: ${error?.message || JSON.stringify(error)}`);
      isSwappingRef.current = false;
      await fetchData();
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    try {
      await supabase
        .from("bookings")
        .update({ status: "cancelled", notes: cancelReason })
        .eq("id", cancelTargetId);
      toast.error(`Antrean ${cancelTargetNumber} dibatalkan.`);
      setIsCancelModalOpen(false);
      setCancelTargetId(null);
      setCancelTargetNumber("");
      await fetchData();
    } catch (error: any) {
      toast.error(`Gagal: ${error?.message}`);
    }
  };

    const waitingListDisplay = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          (b.status === "waiting" || b.status === "in_progress") &&
          b.service_id === selectedServiceId
      )
      .sort((a, b) => {
        // in_progress selalu paling atas
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        // sisanya urut by booking_time
        return a.booking_time.localeCompare(b.booking_time);
      });
  }, [bookings, selectedServiceId]);

  const historyList = useMemo(
    () =>
      bookings
        .filter((b) => b.service_id === selectedServiceId)
        .slice()
        .reverse(),
    [bookings, selectedServiceId]
  );

  const paginatedServices = services.slice(
    (pageService - 1) * itemsPerService,
    pageService * itemsPerService
  );

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 flex flex-col h-full relative">

        {/* HEADER */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="text-indigo-400" size={20} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-indigo-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1.5 px-3 rounded-2xl">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                Alasan Batal:
              </span>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-7 bg-slate-950 border-slate-800 text-[9px] font-bold text-indigo-400 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Orang tidak ada di tempat" className="text-[9px] font-bold">
                    Orang tidak ada
                  </SelectItem>
                  <SelectItem value="Dokumen tidak lengkap" className="text-[9px] font-bold">
                    Dokumen kurang
                  </SelectItem>
                  <SelectItem value="Minta reschedule" className="text-[9px] font-bold">
                    Minta jadwal ulang
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge
              variant="outline"
              className="border-slate-800 text-slate-500 text-[10px] font-black uppercase px-4 py-1.5 rounded-full"
            >
              Mode: Time-Slot Booking (30m)
            </Badge>
          </div>
        </div>

        {/* COUNTER UTAMA */}
        <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-5 shadow-2xl flex items-center justify-between gap-6 shrink-0 z-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Play className="text-indigo-400 fill-indigo-400" size={28} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {services.find((s) => s.id === selectedServiceId)?.name}
                {activeQueue && (
                  <span className="text-indigo-400 ml-2 font-mono">• {activeQueue.booking_time}</span>
                )}
              </p>
              <h1 className="text-5xl font-black text-white font-mono leading-none tracking-tighter">
                {activeQueue?.booking_number || "---"}
              </h1>
            </div>
          </div>

          {activeQueue && <QueueTimer startTime={activeQueue.updated_at} />}

          <div className="flex gap-2">
            {activeQueue ? (
              <>
                <Button
                  onClick={() => handleAction("ULANG")}
                  className="h-14 px-5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 font-black uppercase text-[10px] gap-2"
                >
                  <RotateCcw size={16} /> Panggil Ulang
                </Button>

                <Dialog open={isSkipModalOpen} onOpenChange={setIsSkipModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-14 px-5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-500/20 rounded-xl font-black uppercase text-[10px] gap-2">
                      <SkipForward size={16} /> Skip Antrean
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2rem] max-w-md p-6">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                        <UserCheck size={18} /> Pilih Pengganti {activeQueue.booking_number}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2">
                      {waitingOnly.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic text-center py-10 uppercase font-black">
                          Tidak ada antrean menunggu
                        </p>
                      ) : (
                        waitingOnly.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleAction("SWAP", b.id)}
                            className="w-full p-4 bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 rounded-2xl flex justify-between items-center transition-all group"
                          >
                            <div className="text-left">
                              <p className="text-xl font-mono font-black text-white group-hover:text-indigo-400">
                                {b.booking_number}
                              </p>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                {b.visitor_name} • {b.booking_time}
                              </p>
                            </div>
                            <div className="bg-slate-900 p-2 rounded-lg group-hover:bg-indigo-600/30">
                              <UserCheck
                                className="text-slate-600 group-hover:text-indigo-400"
                                size={20}
                              />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={() => handleAction("SELESAI")}
                  className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} /> Selesai
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleAction("NEXT")}
                className="h-14 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] gap-3 shadow-xl"
              >
                <Volume2 size={18} /> Panggil Berikutnya
              </Button>
            )}
          </div>
        </section>

        {/* LIST SERVICES */}
        <div className="flex items-center gap-3 shrink-0 px-1">
          <Button
            disabled={pageService === 1}
            onClick={() => setPageService((p) => p - 1)}
            variant="outline"
            className="h-12 w-12 bg-slate-900 border-slate-800 rounded-xl"
          >
            <ChevronLeft />
          </Button>
          <div className="flex-1 grid grid-cols-6 gap-3">
            {paginatedServices.map((s) => {
              const count = bookings.filter(
                (b) =>
                  b.service_id === s.id &&
                  (b.status === "waiting" || b.status === "in_progress")
              ).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedServiceId(s.id)}
                  className={`relative h-12 rounded-xl font-black uppercase text-[9px] border transition-all px-3 ${
                    selectedServiceId === s.id
                      ? "bg-indigo-600 border-indigo-500 text-white scale-105 z-20"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  <span className="truncate block">{s.name}</span>
                  {count > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-600 text-white font-black border-2 border-[#020617] px-2 rounded-full">
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            disabled={pageService * itemsPerService >= services.length}
            onClick={() => setPageService((p) => p + 1)}
            variant="outline"
            className="h-12 w-12 bg-slate-900 border-slate-800 rounded-xl"
          >
            <ChevronRight />
          </Button>
        </div>

        {/* TABLES */}
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
          {/* WAITING LIST */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-indigo-600/5 flex justify-between items-center">
              <h3 className="font-black uppercase text-[10px] text-indigo-400">Daftar Tunggu</h3>
              <Badge className="bg-slate-950 text-indigo-400 border-none text-[9px]">
                {waitingListDisplay.length} Antrean
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-500 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-4">Jam</th>
                    <th className="p-4">No Antrean</th>
                    <th className="p-4">Nama</th>
                    <th className="p-4 text-right">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingListDisplay
                    .slice(
                      (pageWaiting - 1) * itemsPerWaiting,
                      pageWaiting * itemsPerWaiting
                    )
                    .map((b) => (
                      <tr
                        key={b.id}
                        className={`border-b border-slate-800/50 ${
                          b.status === "in_progress" ? "bg-indigo-600/10" : ""
                        }`}
                      >
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className="border-indigo-500/30 text-indigo-400 font-mono"
                          >
                            {b.booking_time}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono font-black text-white text-lg">
                          {b.booking_number}
                        </td>
                        <td className="p-4 text-[10px] font-bold uppercase text-slate-400 truncate max-w-[100px]">
                          {b.visitor_name}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => {
                              const target = bookings.find((bk) => bk.id === b.id);
                              setCancelTargetId(b.id);
                              setCancelTargetNumber(target?.booking_number || "");
                              setIsCancelModalOpen(true);
                            }}
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <XCircle size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-between bg-slate-950/50 items-center">
              <Button
                disabled={pageWaiting === 1}
                onClick={() => setPageWaiting((p) => p - 1)}
                className="h-8 w-8 bg-slate-900 rounded-lg border border-slate-800"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[9px] font-black text-slate-600 uppercase">
                Halaman {pageWaiting}
              </span>
              <Button
                disabled={pageWaiting * itemsPerWaiting >= waitingListDisplay.length}
                onClick={() => setPageWaiting((p) => p + 1)}
                className="h-8 w-8 bg-slate-900 rounded-lg border border-slate-800"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-black uppercase text-[10px] text-slate-500">Riwayat Layanan</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-[9px] font-black text-slate-500 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-4">No & Jam</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList
                    .slice(
                      (pageHistory - 1) * itemsPerHistory,
                      pageHistory * itemsPerHistory
                    )
                    .map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-800/50 hover:bg-white/[0.01]"
                      >
                        <td className="p-4">
                          <div className="flex gap-2">
                            <p className="font-mono font-bold text-slate-300">{b.booking_number}</p>
                            <span className="text-[8px] text-slate-600 self-center">
                              @ {b.booking_time}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-600 uppercase font-bold">
                            {b.visitor_name}
                          </p>
                          {b.status === "cancelled" && (
                            <p className="text-[7px] text-red-500 font-black italic uppercase tracking-tighter">
                              Batal: {b.notes}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[8px] font-black border-none ${
                              b.status === "completed"
                                ? "text-emerald-500 bg-emerald-500/10"
                                : b.status === "cancelled"
                                ? "text-red-500 bg-red-500/10"
                                : "text-slate-600 bg-slate-800/50"
                            }`}
                          >
                            {b.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-between bg-slate-950/50 items-center">
              <Button
                disabled={pageHistory === 1}
                onClick={() => setPageHistory((p) => p - 1)}
                className="h-8 w-8 bg-slate-900 rounded-lg border border-slate-800"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[9px] font-black text-slate-600 uppercase">
                Halaman {pageHistory}
              </span>
              <Button
                disabled={pageHistory * itemsPerHistory >= historyList.length}
                onClick={() => setPageHistory((p) => p + 1)}
                className="h-8 w-8 bg-slate-900 rounded-lg border border-slate-800"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Konfirmasi Batalkan Antrean ── */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2rem] max-w-sm p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <DialogTitle className="text-base font-black uppercase tracking-widest text-white text-center">
                Batalkan Antrean?
              </DialogTitle>
              <DialogDescription className="text-center text-[11px] text-slate-500 font-medium leading-relaxed">
                Antrean <span className="text-white font-black font-mono">{cancelTargetNumber}</span> akan dibatalkan
                dengan alasan:{" "}
                <span className="text-red-400 font-bold">{cancelReason}</span>
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 mt-2">
            <Button
              onClick={handleConfirmCancel}
              className="h-12 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-red-600/20 gap-2"
            >
              <XCircle size={15} /> Ya, Batalkan
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsCancelModalOpen(false)}
              className="h-11 rounded-2xl font-black text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}