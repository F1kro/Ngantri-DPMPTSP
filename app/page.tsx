"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardCheck,
  MonitorPlay,
  Zap,
  ArrowRight,
  MousePointer2,
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-[#020617] text-slate-200 overflow-x-hidden">
      {/* Ambient Light */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-24">
        {/* Hero Section */}
        <section className="text-center space-y-6 mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
            <Zap size={14} /> DPMPTSP Lombok Barat
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-none">
            SISTEM{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
              ANTREAN
            </span>
            <br />
            TERPADU
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed px-4">
            Cara baru urus antrean di DPMPTSP Lombok Barat. Lebih praktis,
            transparan, dan pastinya bisa dipantau dari manapun.
          </p>
        </section>

        {/* Menu Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
          <MenuCard
            href="/booking"
            title="Daftar Antrean"
            desc="Ambil nomor antrean secara online tanpa perlu datang langsung ke kantor."
            icon={<ClipboardCheck size={48} />}
            color="indigo"
          />
          <MenuCard
            href="/dashboard"
            title="Cek Antrean"
            desc="Pantau nomor antrean yang sedang dilayani secara real-time dari HP Anda."
            icon={<MonitorPlay size={48} />}
            color="blue"
          />
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-slate-900 text-center space-y-6">
          <div className="space-y-2 px-4">
            <p className="text-slate-500 font-black tracking-[0.2em] text-sm uppercase">
              DPMPTSP KABUPATEN LOMBOK BARAT
            </p>
            <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-lg mx-auto italic">
              Jl. Soekarno - Hatta No. 1, Giri Menang, Gerung, Kabupaten Lombok
              Barat, Nusa Tenggara Barat.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-900/50 max-w-xs mx-auto">
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
              Sistem Antrean Terpadu © 2026
            </p>
            <p className="text-slate-700 text-[9px] mt-1 italic font-mono">
              Layanan cepat, transparan, dan akuntabel.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function MenuCard({
  href,
  title,
  desc,
  icon,
  color,
}: {
  href: string;
  title: string;
  desc: string;
  icon: any;
  color: "indigo" | "blue";
}) {
  const styles = {
    indigo: {
      border: "border-indigo-500/30",
      icon: "text-indigo-400 bg-indigo-500/10",
      button: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20",
    },
    blue: {
      border: "border-blue-500/30",
      icon: "text-blue-400 bg-blue-500/10",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
    },
  };

  return (
    <Card
      className={`h-full bg-slate-900/60 ${styles[color].border} backdrop-blur-xl rounded-[3rem] p-8 md:p-10 shadow-2xl transition-all border-2`}
    >
      <CardContent className="p-0 flex flex-col items-center text-center space-y-8">
        {/* Icon tetap berwarna (Putih/Warna Terang) agar tidak gelap */}
        <div
          className={`p-6 rounded-[2rem] border-2 ${styles[color].border} ${styles[color].icon} shadow-inner`}
        >
          {icon}
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
            {title}
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed font-medium">
            {desc}
          </p>
        </div>

        {/* Button gede biar ramah jempol & ramah Boomer */}
        <Link href={href} className="w-full">
          <Button
            className={`w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl gap-3 transition-transform active:scale-95 ${styles[color].button}`}
          >
            KLIK DI SINI <MousePointer2 size={20} />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
