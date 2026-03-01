"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Lu bisa kirim log error ke console atau service log eksternal
    console.error("SYSTEM_CRASH:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-6 bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] mb-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative">
        <AlertTriangle size={64} className="text-red-500 animate-pulse" />
        <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 rounded-full border-4 border-[#020617]" />
      </div>

      <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">System Interrupted</h1>
      <p className="text-slate-400 text-sm max-w-md mb-8 font-medium italic">
        Terjadi gangguan pada sistem atau koneksi database terputus. Jangan panik, King. Silakan coba muat ulang halaman.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button
          onClick={() => reset()}
          className="h-14 flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-0 transition-all gap-2 uppercase text-xs"
        >
          <RefreshCw size={18} /> Muat Ulang
        </Button>
        <Link href="/" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-14 bg-slate-900 border-slate-800 text-slate-400 hover:text-white rounded-2xl border-b-4 border-slate-950 active:translate-y-[2px] active:border-b-0 transition-all gap-2 uppercase text-xs"
          >
            <Home size={18} /> Beranda
          </Button>
        </Link>
      </div>
      
      <p className="mt-12 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Error ID: {error.digest || 'UNKNOWN_STATION'}</p>
    </div>
  );
}