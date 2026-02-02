"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/admin/sidebar";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ManajemenLayanan() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState<string | null>(null);

  const [newService, setNewService] = useState({
    name: "",
    description: "",
    estimated_duration: 15,
  });
  const [editService, setEditService] = useState({
    id: "",
    name: "",
    description: "",
    estimated_duration: 15,
  });

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true });
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return services.slice(start, start + itemsPerPage);
  }, [services, currentPage]);

  const totalPages = Math.ceil(services.length / itemsPerPage);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from("services").insert([newService]);
    if (error) {
      toast.error("Gagal menambahkan layanan");
    } else {
      toast.success("Layanan Berhasil Ditambahkan");
      setOpenAdd(false);
      setNewService({ name: "", description: "", estimated_duration: 15 });
      fetchServices();
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase
      .from("services")
      .update({
        name: editService.name,
        description: editService.description,
        estimated_duration: editService.estimated_duration,
      })
      .eq("id", editService.id);

    if (error) {
      toast.error("Gagal memperbarui layanan");
    } else {
      toast.success("Perubahan Disimpan");
      setOpenEdit(false);
      fetchServices();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (!error) {
      toast.success("Layanan Dihapus");
      fetchServices();
    }
    setOpenDelete(null);
  };

  return (
    // MODIFIKASI: Ditambahkan h-screen overflow-hidden agar sidebar terkunci
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      {/* AREA KANAN: h-full overflow-hidden agar area ini yang handle scroll sendiri */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* AREA KONTEN: overflow-y-auto biar sidebar GAK IKUT SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {/* HEADER - Tetap Compact (Style Rekap) */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 font-bold">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                Manajemen Layanan
              </h2>
              <p className="text-indigo-400/80 text-[10px] font-black uppercase tracking-[0.2em]">
                Konfigurasi Kategori Pelayanan
              </p>
            </div>

            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black h-10 px-6 rounded-xl shadow-lg gap-2 transition-all active:scale-95"
                >
                  <Plus size={16} /> TAMBAH LAYANAN
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-[2.5rem] shadow-2xl p-10 max-w-lg [&>button]:hidden">
                <DialogHeader className="space-y-2">
                  <div className="p-3 bg-indigo-600 w-fit rounded-2xl mb-2 shadow-lg shadow-indigo-600/20">
                    <Plus size={24} />
                  </div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                    Layanan Baru
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-sm font-medium">
                    Atur detail dan durasi estimasi layanan.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Nama Layanan
                    </label>
                    <Input
                      placeholder="Nama layanan..."
                      className="bg-slate-950 border-slate-800 h-14 rounded-2xl text-white font-bold"
                      value={newService.name}
                      onChange={(e) =>
                        setNewService({ ...newService, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Durasi Pelayanan (Menit)
                    </label>
                    <div className="relative">
                      <Clock
                        className="absolute left-4 top-4 text-indigo-400"
                        size={18}
                      />
                      <Input
                        type="number"
                        className="bg-slate-950 border-slate-800 h-14 pl-12 rounded-2xl text-white font-bold"
                        value={newService.estimated_duration}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            estimated_duration: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Keterangan Singkat
                    </label>
                    <Input
                      placeholder="Deskripsi kategori layanan..."
                      className="bg-slate-950 border-slate-800 h-14 rounded-2xl text-white placeholder:text-slate-700"
                      value={newService.description}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      onClick={() => setOpenAdd(false)}
                      className="flex-1 h-16 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 uppercase tracking-widest text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] h-16 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-indigo-500"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "SIMPAN LAYANAN"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          {/* TABEL DATA - Tetap Compact (Style Rekap) */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 z-10">
                  <tr>
                    <th className="px-5 py-4">Nama Layanan</th>
                    <th className="px-5 py-4 text-center">Durasi</th>
                    <th className="px-5 py-4">Deskripsi</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-20 text-center text-indigo-400"
                      >
                        <Loader2 className="animate-spin mx-auto" size={24} />
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-indigo-500/[0.02] transition-colors group"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-indigo-400">
                              <Briefcase size={16} />
                            </div>
                            <span className="text-sm font-bold text-white uppercase">
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge
                            variant="outline"
                            className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono"
                          >
                            {s.estimated_duration} Menit
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[11px] text-slate-400 truncate max-w-[250px] ">
                            {s.description || "-"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              onClick={() => {
                                setEditService({
                                  id: s.id,
                                  name: s.name,
                                  description: s.description || "",
                                  estimated_duration:
                                    s.estimated_duration || 15,
                                });
                                setOpenEdit(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white transition-all"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              onClick={() => setOpenDelete(s.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-red-600 text-white transition-all"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* NAVIGASI PAGINASI (Style Rekap) */}
            <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-slate-500 uppercase">
                Halaman {currentPage} dari {totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 w-8 p-0 bg-slate-900 border-slate-800 hover:bg-indigo-600 text-white"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT - Balik ke Style Gahar (p-10, text-3xl, font-black) */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="bg-[#0f172a] border-slate-800 text-white rounded-[2.5rem] p-10 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2">
            <div className="p-3 bg-amber-500/20 w-fit rounded-2xl mb-2 border border-amber-500/30">
              <Settings2 size={24} className="text-amber-500" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">
              Ubah Layanan
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm font-medium">
              Perbarui kategori dan estimasi waktu pelayanan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 pt-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Nama Layanan
              </label>
              <Input
                className="bg-slate-950 border-slate-800 h-16 rounded-2xl text-white font-bold text-xl"
                value={editService.name}
                onChange={(e) =>
                  setEditService({ ...editService, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Durasi Pelayanan (Menit)
              </label>
              <div className="relative">
                <Clock
                  className="absolute left-4 top-5 text-amber-500"
                  size={18}
                />
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-16 pl-12 rounded-2xl text-white font-bold text-xl"
                  value={editService.estimated_duration}
                  onChange={(e) =>
                    setEditService({
                      ...editService,
                      estimated_duration: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Deskripsi
              </label>
              <Input
                className="bg-slate-950 border-slate-800 h-16 rounded-2xl text-white"
                value={editService.description}
                onChange={(e) =>
                  setEditService({
                    ...editService,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-4 pt-8">
              <Button
                type="button"
                onClick={() => setOpenEdit(false)}
                className="h-16 flex-1 text-slate-400 font-bold hover:bg-white/5 rounded-2xl"
              >
                BATAL
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-16 flex-[2] bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-indigo-500"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "SIMPAN PERUBAHAN"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DELETE - Balik ke Style Gahar (p-8, text-red-500 raksasa) */}
      <AlertDialog
        open={!!openDelete}
        onOpenChange={(o) => !o && setOpenDelete(null)}
      >
        <AlertDialogContent className="bg-[#0f172a] border-slate-800 text-white rounded-[2rem] p-8 shadow-2xl shadow-red-500/10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 w-fit rounded-full text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase">
                Konfirmasi Hapus
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin menghapus layanan ini? Tindakan ini{" "}
                <span className="text-red-400 font-bold underline">
                  tidak dapat dibatalkan
                </span>
                .
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3 sm:justify-center">
            <AlertDialogCancel className="h-14 px-8 bg-slate-800 text-white border-none rounded-xl hover:bg-slate-700 transition-colors font-bold uppercase text-xs">
              BATAL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => openDelete && handleDelete(openDelete)}
              className="h-14 px-8 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all"
            >
              YA, HAPUS PERMANEN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
