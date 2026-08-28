import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, ShoppingCart, Camera, Printer, FileUp, MessageSquareHeart, LayoutDashboard,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Admin Dapur / Vendor',
  gizi: 'Ahli Gizi / Auditor',
  sekolah: 'Pihak Sekolah / Guru',
};

// Setiap langkah menyimpan daftar role yang relevan + deskripsi khusus per role.
const ALL_STEPS = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    title: 'Pantau Dashboard Harian',
    roles: ['admin', 'gizi', 'sekolah'],
    desc: {
      admin: 'Dashboard menampilkan porsi terdistribusi, HPP per porsi, skor gizi, rating orang tua, grafik anggaran 7 hari, dan status kesiapan SIPGN. Gunakan ini sebagai kontrol pusat operasional dapur Anda setiap pagi.',
      gizi: 'Dashboard menampilkan skor gizi harian, tren kepatuhan AKG, rating kepuasan orang tua, dan status kesiapan SIPGN. Jadikan ini titik awal untuk memantau kualitas gizi menu yang disajikan.',
      sekolah: 'Dashboard menampilkan status porsi hari ini, skor gizi, dan rating orang tua. Anda dapat memantau kesiapan dan kualitas makanan yang akan tiba di sekolah Anda.',
    },
  },
  {
    key: 'menu',
    icon: Sparkles,
    title: 'Menu Bergizi dengan AI',
    roles: ['admin', 'gizi'],
    desc: {
      admin: 'Buka "AI Menu Generator", masukkan budget per porsi (default Rp 15.000), jumlah porsi, kelompok usia, dan centang bahan lokal yang tersedia. AI membuat 3 opsi menu: Ekonomis, Seimbang, High-Protein lengkap dengan analisis gizi & biaya. Jika AI lambat, sistem otomatis memakai Template Teroptimasi. Klik "Kunci Menu" pada opsi terbaik.',
      gizi: 'Di "AI Menu Generator", tinjau 3 opsi menu yang dihasilkan AI beserta rincian gizi (kalori, protein, karbohidrat, lemak) dan kesesuaian standar 4 Bintang BGN. Pastikan menu yang dikunci memenuhi AKG sebelum masuk produksi.',
    },
  },
  {
    key: 'procurement',
    icon: ShoppingCart,
    title: 'Kirim PO Belanja via WhatsApp',
    roles: ['admin'],
    desc: {
      admin: 'Buka "Belanja & PO WhatsApp". Menu terkunci otomatis dikonversi menjadi Daftar Belanja Pasar Tradisional lengkap kuantitas & estimasi harga. Pilih pedagang pasar, lalu klik "Kirim PO via WhatsApp" — pesan PO terformat rapi langsung terbuka di WhatsApp pedagang.',
    },
  },
  {
    key: 'qc',
    icon: Camera,
    title: 'Audit Foto QC',
    roles: ['admin', 'gizi', 'sekolah'],
    desc: {
      admin: 'Sebelum makanan dikirim, unggah foto tray makanan di "Audit Foto QC". Lokasi & waktu tercatat otomatis. Isi checklist: Higienitas, Suhu, Gizi 4 Bintang, dan Uji Rasa, lalu ajukan ke Ahli Gizi untuk persetujuan.',
      gizi: 'Di "Audit Foto QC", tinjau foto tray beserta geotag & timestamp. Verifikasi checklist Higienitas, Suhu, Gizi 4 Bintang, dan Uji Rasa. Klik "Siap Distribusi" untuk menyetujui, atau minta perbaikan bila belum sesuai standar. Foto yang Anda setujui otomatis tampil di Portal Orang Tua.',
      sekolah: 'Di "Audit Foto QC", Anda dapat melihat bukti foto porsi nyata beserta lokasi, waktu, dan status persetujuan Ahli Gizi. Ini memastikan makanan yang tiba di sekolah sudah lolos pemeriksaan kualitas.',
    },
  },
  {
    key: 'distribution',
    icon: Printer,
    title: 'Distribusi & Label Box QR',
    roles: ['admin', 'sekolah'],
    desc: {
      admin: 'Di "Distribusi & Label", pantau status pengiriman per sekolah (Di Dapur → Dalam Pengiriman → Terkirim). Klik "Cetak Label Box" untuk membuat stiker berisi nama sekolah, waktu masak, ringkasan gizi, peringatan alergen, dan QR Code menuju Portal NutriTransparan.',
      sekolah: 'Di "Distribusi & Label", pantau status kedatangan makanan ke sekolah Anda dan perbarui statusnya menjadi "Terkirim" saat box diterima. Pindai QR pada label box untuk melihat detail gizi & keamanan pangan.',
    },
  },
  {
    key: 'finance',
    icon: FileUp,
    title: 'Keuangan & Ekspor Laporan SIPGN',
    roles: ['admin'],
    desc: {
      admin: 'Di "Keuangan & SIPGN", tinjau tabel biaya operasional harian (bahan pangan, gas/listrik, kemasan, tenaga kerja) dan kepatuhan anggaran Rp 15.000/porsi. Klik "Unduh PDF Laporan SIPGN / BGN" untuk mengunduh dokumen PDF rapi yang siap diunggah ke sistem resmi pemerintah.',
    },
  },
  {
    key: 'feedback',
    icon: MessageSquareHeart,
    title: 'Ulasan Orang Tua',
    roles: ['admin', 'gizi', 'sekolah'],
    desc: {
      admin: 'Di "Ulasan Orang Tua", pantau rating bintang dan komentar orang tua terhadap porsi harian. Gunakan masukan ini untuk meningkatkan mutu menu dan layanan dapur.',
      gizi: 'Di "Ulasan Orang Tua", cermati rating & komentar orang tua sebagai indikator penerimaan menu. Masukan ini membantu Anda menyempurnakan komposisi gizi agar tetap disukai anak.',
      sekolah: 'Di "Ulasan Orang Tua", lihat rekap ulasan dari orang tua murid mengenai makanan yang diterima, sebagai bahan komunikasi antara sekolah, dapur, dan orang tua.',
    },
  },
];

export const TutorialModal = ({ open, onOpenChange, role = 'admin' }) => {
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => ALL_STEPS.filter((s) => s.roles.includes(role)).map((s) => ({
      icon: s.icon,
      title: s.title,
      desc: s.desc[role] || Object.values(s.desc)[0],
    })),
    [role],
  );

  // Reset ke langkah awal setiap modal dibuka / role berubah
  useEffect(() => {
    if (open) setStep(0);
  }, [open, role]);

  if (steps.length === 0) return null;
  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="tutorial-modal">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Icon className="h-4 w-4 text-emerald-700" />
            </span>
            Panduan Penggunaan
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            Alur kerja NutriDapur OS untuk peran Anda
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" data-testid="tutorial-role-badge">
              {ROLE_LABELS[role] || role}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <Progress value={((safeStep + 1) / steps.length) * 100} className="h-1.5" />
        <div className="py-2 min-h-[170px]">
          <h3 className="font-display font-semibold text-lg" data-testid="tutorial-step-title">{current.title}</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.desc}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Langkah {safeStep + 1} dari {steps.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={safeStep === 0} data-testid="tutorial-prev-button">
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>
            {safeStep < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} data-testid="tutorial-next-button" className="bg-primary">
                Berikutnya <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => { onOpenChange(false); setStep(0); }} data-testid="tutorial-finish-button" className="bg-primary">
                Mulai Bekerja
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
