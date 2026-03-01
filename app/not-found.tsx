import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-8 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-full mb-8 relative">
        <SearchX size={50} className="text-indigo-400" />
      </div>

      <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-2">404</h1>
      <p className="text-indigo-400 font-black uppercase text-xs tracking-[0.2em] mb-4">
        Halaman Tidak Ditemukan
      </p>
      <p className="text-slate-500 text-sm max-w-sm mb-8 font-medium leading-relaxed">
        Mohon maaf, tautan atau halaman yang Anda akses tidak tersedia atau telah dipindahkan. 
        Pastikan alamat URL yang Anda tuju sudah benar.
      </p>

      <Link href="/">
        <Button className="h-14 px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-0 transition-all gap-3 uppercase text-xs shadow-xl shadow-indigo-500/20">
          <ArrowLeft size={18} /> Kembali ke Dashboard 
        </Button>
      </Link>

      <footer className="mt-12">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
          Sistem Antrean Digital • DPMPTSP Kabupaten Lombok Barat
        </p>
      </footer>
    </div>
  );
}