'use client'
import { LayoutDashboard, Database, ClipboardList, LogOut, ChevronRight, AlertCircle, ListChecks } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const menus = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/admin/dashboard' },
    { label: 'Manajemen Antrean', icon: <ListChecks size={20}/>, path: '/admin/antrian' },
    { label: 'Manajemen Layanan', icon: <Database size={20}/>, path: '/admin/services' },
    { label: 'Rekap Antrean', icon: <ClipboardList size={20}/>, path: '/admin/rekap' },
  ]

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      setShowLogoutDialog(false)
      
      // 1. Sign out dari Supabase (ini akan clear cookies secara otomatis)
      await supabase.auth.signOut({
        scope: 'global' // Important: ini akan logout dari semua tabs/windows
      })

      // 2. Clear semua storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // 3. Clear semua cookies manually (optional tapi recommended)
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }

      // 4. Hard redirect (PENTING: pakai window.location, bukan router.push)
      window.location.href = '/admin/login'
      
    } catch (error) {
      console.error('Logout error:', error)
      // Tetap redirect even if error
      window.location.href = '/admin/login'
    }
  }

  return (
    <>
      <aside className="w-72 bg-slate-950 border-r border-slate-800 hidden lg:flex flex-col h-screen shrink-0 sticky top-0 overflow-hidden">
        {/* Header Sidebar */}
        <div className="p-8 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Database size={24} className="text-white" />
          </div>
          <span className="text-xl font-black uppercase tracking-tighter text-white">Admin DPMPTSP</span>
        </div>
        
        {/* Navigasi */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {menus.map((menu) => (
            <button
              key={menu.path}
              onClick={() => router.push(menu.path)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                pathname === menu.path 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                {menu.icon} {menu.label}
              </div>
              {pathname === menu.path && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-slate-800 shrink-0">
          <Button 
            variant="ghost" 
            onClick={() => setShowLogoutDialog(true)} 
            disabled={isLoggingOut}
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10 gap-3 font-bold uppercase text-[10px] tracking-widest h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={20} /> {isLoggingOut ? 'Memproses...' : 'Keluar Sistem'}
          </Button>
        </div>
      </aside>

      {/* ALERT DELETE - Style Gahar (Sama persis dengan Manajemen Layanan) */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-[#0f172a] border-slate-800 text-white rounded-[2rem] p-8 shadow-2xl shadow-red-500/10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 w-fit rounded-full text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase">
                Konfirmasi Logout
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sistem? Anda harus{' '}
                <span className="text-red-400 font-bold underline">
                  login kembali
                </span>
                {' '}untuk mengakses dashboard admin.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <AlertDialogCancel className="h-14 px-8 bg-slate-800 text-white border-none rounded-xl hover:bg-slate-700 transition-colors font-bold uppercase text-xs">
              BATAL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-14 px-8 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {isLoggingOut ? 'MEMPROSES...' : 'YA, KELUAR SISTEM'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}