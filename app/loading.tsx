import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" size={48} />
        <div className="absolute inset-0 h-16 w-16 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-black text-white uppercase tracking-[0.3em] animate-pulse">Sinkronisasi...</p>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">DPMPTSP - Lombok Barat</p>
      </div>
    </div>
  );
}