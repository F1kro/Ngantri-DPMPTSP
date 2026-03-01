"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveBookingToCookie } from "@/lib/cookies";
import { createLog } from "@/lib/logger"; // IMPORT LOGGER
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  Loader2,
  Sparkles,
  User,
  Phone,
  Briefcase,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- LOGIKA WAKTU WITA ---
const getWitaNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
};

const getWitaDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30",
];

export default function BookingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [now, setNow] = useState<Date>(getWitaNow());

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    serviceId: "",
    date: getWitaDateString(getWitaNow()),
    time: "",
  });

  // Ticker tiap 30 detik biar slot "LEWAT" otomatis update tanpa refresh
  useEffect(() => {
    const tick = () => setNow(getWitaNow());
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Ambil data layanan
  useEffect(() => {
    supabase.from("services").select("*").order("name").then(({ data }) => setServices(data || []));
  }, []);

  // AMBIL SLOT YANG TERISI (Kecuali yang dicancel)
  const fetchBookedSlots = async () => {
    if (!formData.date) return;
    const { data } = await supabase
      .from("bookings")
      .select("booking_time")
      .eq("booking_date", formData.date)
      .neq("status", "cancelled");

    if (data) setBookedSlots(data.map((b) => b.booking_time));
  };

  useEffect(() => { 
    fetchBookedSlots(); 
  }, [formData.date]);

  // Logika pengecekan ketersediaan slot hari ini
  const isToday = formData.date === getWitaDateString(now);
  const availableSlots = TIME_SLOTS.filter((slot) => {
    const isBooked = bookedSlots.includes(slot);
    const [sH, sM] = slot.split(":").map(Number);
    const isPast = isToday && (sH * 60 + sM) <= (now.getHours() * 60 + now.getMinutes());
    return !isBooked && !isPast;
  });

  const isAllPast = isToday && TIME_SLOTS.every((slot) => {
    const [sH, sM] = slot.split(":").map(Number);
    return (sH * 60 + sM) <= (now.getHours() * 60 + now.getMinutes());
  });

  const isAllBooked = TIME_SLOTS.every((slot) => bookedSlots.includes(slot));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId || !formData.time) return toast.error("Lengkapi data!");

    setLoading(true);
    try {
      // 1. Validasi Waktu (WITA)
      if (isToday) {
        const [h, m] = formData.time.split(":").map(Number);
        const slotMins = h * 60 + m;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        if (slotMins <= nowMins) {
          throw new Error("Waktu sudah lewat, pilih jam lain!");
        }
      }

      // 2. Cek apakah slot masih tersedia
      const { data: slotTerisi } = await supabase
        .from("bookings")
        .select("id")
        .eq("booking_date", formData.date)
        .eq("booking_time", formData.time)
        .neq("status", "cancelled")
        .single();

      if (slotTerisi) {
        fetchBookedSlots();
        throw new Error("Slot baru saja diambil orang lain!");
      }

      // 3. Ambil data prefix & hitung antrean
      const { data: sData } = await supabase.from("services").select("name, prefix_code").eq("id", formData.serviceId).single();
      const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("booking_date", formData.date);
      
      const num = (count || 0) + 1;
      const booking_number = `${sData?.prefix_code || "A"}-${String(num).padStart(3, "0")}`;

      // 4. Insert data ke Supabase
      const { data, error } = await supabase.from("bookings").insert([{
        booking_number,
        visitor_name: formData.name,
        visitor_phone: formData.phone,
        service_id: formData.serviceId,
        booking_date: formData.date,
        booking_time: formData.time,
        status: "waiting",
        queue_position: num,
      }]).select();

      if (error) {
        if (error.code === "23505") throw new Error("Slot ini sudah dipesan orang lain!");
        throw error;
      }

      if (data?.[0]) {
        // LOG: Booking Berhasil
        createLog(
          'BOOKING', 
          `Pengunjung baru: ${formData.name} mengambil antrean ${booking_number} untuk layanan ${sData?.name}`,
          'info',
          { booking_id: data[0].id, visitor_name: formData.name }
        );

        saveBookingToCookie({ ...data[0] });
        toast.success("Booking berhasil!");
        router.push(`/booking-confirmation/${data[0].id}`);
      }
    } catch (error: any) {
      // LOG: Gagal Booking
      createLog('ERROR', `Gagal ambil antrean: ${error.message}`, 'error', { visitor_name: formData.name });
      toast.error(error.message);
      fetchBookedSlots();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col items-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-xl z-10 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
        <header className="flex items-center justify-between bg-slate-900/60 p-3 md:p-4 rounded-3xl border border-slate-800 backdrop-blur-md shrink-0 shadow-xl">
          <div className="flex items-center gap-3 ml-1">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-sm md:text-lg font-black uppercase tracking-tight leading-none">Ambil Antrean</h1>
          </div>
          <Link href="/"><Button variant="outline" size="sm" className="h-10 rounded-2xl gap-2 bg-slate-800/50 border-slate-700 text-indigo-400 font-black text-[9px] md:text-xs uppercase border-b-4 border-b-indigo-900/50"><Home size={14} /> Dashboard</Button></Link>
        </header>

        <div className="space-y-6 pb-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Reservasi Jadwal</h2>
            <p className="text-slate-400 text-[11px] md:text-sm font-medium italic">Pilih waktu kedatangan (WITA) yang tersedia.</p>
          </div>

          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden border-2">
            <CardContent className="p-6 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><User size={12} /> Nama</Label>
                    <Input placeholder="Nama Lengkap" className="h-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white font-bold text-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Phone size={12} /> WhatsApp</Label>
                    <Input type="tel" placeholder="0812..." className="h-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white font-bold text-sm" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-white text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={12} /> Tanggal Kedatangan</Label>
                  <Input 
                    type="date" 
                    min={getWitaDateString(getWitaNow())} 
                    className="h-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white font-bold text-sm [color-scheme:dark]" 
                    value={formData.date} 
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, time: "" })} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase size={12} /> Layanan</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, serviceId: val })}>
                    <SelectTrigger className="w-full !h-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white font-bold text-sm"><SelectValue placeholder="Pilih Layanan" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-2xl">
                      {services.map((s) => (<SelectItem key={s.id} value={s.id} className="py-3 font-bold text-xs">{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={12} /> Jam Tersedia</Label>
                  
                  {/* Alert Kondisi Full / Selesai */}
                  {availableSlots.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 mb-4">
                      <AlertCircle size={18} />
                      <p className="text-[11px] font-bold uppercase leading-tight">
                        {isAllPast 
                          ? "Jam layanan hari ini sudah selesai, silahkan booking antrean untuk besok." 
                          : "Slot layanan untuk hari ini sudah full, silahkan booking antrean untuk besok."}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlots.includes(slot);
                      const [sH, sM] = slot.split(":").map(Number);
                      const isPast = isToday && (sH * 60 + sM) <= (now.getHours() * 60 + now.getMinutes());
                      
                      const isDisabled = isBooked || isPast;
                      const isSelected = formData.time === slot;

                      return (
                        <button 
                          key={slot} 
                          type="button" 
                          disabled={isDisabled} 
                          onClick={() => setFormData({ ...formData, time: slot })}
                          className={`py-3 rounded-xl text-[10px] font-black transition-all border-b-4 ${
                            isDisabled ? "bg-slate-800/20 border-slate-900 text-slate-600 cursor-not-allowed opacity-50" :
                            isSelected ? "bg-indigo-600 border-indigo-800 text-white scale-95" :
                            "bg-slate-800 border-slate-950 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {slot}
                          <span className="block text-[7px] opacity-60">
                            {isBooked ? "FULL" : isPast ? "LEWAT" : "READY"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  disabled={loading || !formData.time} 
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-4 border-b-4 border-b-indigo-800"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "KONFIRMASI JADWAL"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}