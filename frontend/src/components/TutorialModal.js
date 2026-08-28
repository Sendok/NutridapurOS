import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ShoppingCart, Camera, Printer, FileUp, ChevronLeft, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    title: '1. Rencanakan Menu dengan AI',
    desc: 'Buka menu "AI Menu Generator", masukkan budget per porsi (default Rp 15.000), jumlah porsi, kelompok usia (SD/SMP/SMA), dan centang bahan lokal yang tersedia di pasar. AI akan membuat 3 opsi menu: Ekonomis, Seimbang, dan High-Protein lengkap dengan analisis gizi & biaya. Jika AI lambat, sistem otomatis memakai Template Menu Teroptimasi (Mode Cepat). Klik "Kunci Menu" pada opsi terbaik untuk produksi hari ini.',
  },
  {
    icon: ShoppingCart,
    title: '2. Kirim PO Belanja via WhatsApp',
    desc: 'Buka "Belanja & PO WhatsApp". Menu terkunci otomatis dikonversi menjadi Daftar Belanja Pasar Tradisional lengkap dengan kuantitas dan estimasi harga. Pilih pedagang pasar (atau tambah pedagang baru), lalu klik "Kirim PO via WhatsApp" — pesan PO terformat rapi akan langsung terbuka di WhatsApp pedagang.',
  },
  {
    icon: Camera,
    title: '3. Audit Foto QC Sebelum Distribusi',
    desc: 'Sebelum makanan dikirim, unggah foto tray makanan di "Audit Foto QC". Lokasi & waktu tercatat otomatis. Isi checklist: Higienitas, Suhu, Gizi 4 Bintang, dan Uji Rasa. Ahli Gizi akan menyetujui ("Siap Distribusi") atau meminta perbaikan. Foto yang disetujui otomatis tampil di Portal Orang Tua.',
  },
  {
    icon: Printer,
    title: '4. Cetak Label Box + QR Code',
    desc: 'Di halaman "Distribusi & Label", pantau status pengiriman per sekolah (Di Dapur → Dalam Pengiriman → Terkirim). Klik "Cetak Label Box" untuk membuat stiker berisi nama sekolah, waktu masak, ringkasan gizi, peringatan alergen, dan QR Code yang bisa dipindai orang tua menuju Portal NutriTransparan.',
  },
  {
    icon: FileUp,
    title: '5. Ekspor Laporan SIPGN / BGN',
    desc: 'Di halaman "Keuangan & SIPGN", tinjau tabel biaya operasional harian (bahan pangan, gas/listrik, kemasan, tenaga kerja) dan kepatuhan anggaran Rp 15.000/porsi. Klik "Ekspor Format Laporan SIPGN / BGN" untuk mengunduh laporan standar yang siap diunggah ke sistem resmi pemerintah.',
  },
];

export const TutorialModal = ({ open, onOpenChange }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
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
          <DialogDescription>Alur kerja harian NutriDapur OS dalam 5 langkah</DialogDescription>
        </DialogHeader>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        <div className="py-2 min-h-[150px]">
          <h3 className="font-display font-semibold text-lg">{current.title}</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.desc}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Langkah {step + 1} dari {STEPS.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} data-testid="tutorial-prev-button">
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>
            {step < STEPS.length - 1 ? (
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
