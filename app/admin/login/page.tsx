'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw new Error('Email atau kata sandi tidak valid.')

      if (data.session) {
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#0f172a] overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="w-full max-w-[440px] z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md mb-2">
             <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Portal Administrasi</h1>
          <p className="text-slate-400 text-sm font-medium">DPMPTSP Satu Pintu • Manajemen Antrean</p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 md:p-10 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="p-1 rounded-full bg-red-500/20">
                  <Lock size={14} className="text-red-400" />
                </div>
                <p className="text-red-400 text-xs font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Email Petugas
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="admin@dinas.go.id"
                    className="h-14 pl-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Kata Sandi
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••"
                    className="h-14 pl-12 bg-slate-950/50 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Otentikasi...</span>
                  </div>
                ) : (
                  "Masuk Dashboard"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors text-sm font-semibold">
            <ArrowLeft size={16} /> 
            <span>Kembali ke Halaman Publik</span>
          </Link>
        </div>
      </div>
    </main>
  )
}