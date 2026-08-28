import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChefHat, Sparkles, ShoppingCart, Camera, QrCode, HeartHandshake, CheckCircle2, ArrowRight,
  ShieldCheck, Timer, TrendingUp, Building2, XCircle,
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1562514155-444b9a967dfa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400';

const FEATURES = [
  { icon: Sparkles, title: 'AI Budget Optimizer', desc: 'AI menyusun 3 opsi menu bergizi (Ekonomis, Seimbang, High-Protein) sesuai anggaran Rp 15.000/porsi dan standar AKG BGN.' },
  { icon: ShoppingCart, title: 'WA Procurement Pasar', desc: 'Daftar belanja pasar tradisional otomatis dari menu terkunci, kirim PO langsung ke pedagang via WhatsApp sekali klik.' },
  { icon: Camera, title: 'Audit Foto QC', desc: 'Foto tray makanan dengan geotag & timestamp, checklist higienitas-suhu-gizi-rasa, persetujuan Ahli Gizi sebelum distribusi.' },
  { icon: QrCode, title: 'Label Box QR', desc: 'Cetak stiker box makanan berisi ringkasan gizi, peringatan alergen, dan QR code menuju portal transparansi orang tua.' },
  { icon: HeartHandshake, title: 'Portal Orang Tua (NutriTransparan)', desc: 'Orang tua memindai QR dan melihat foto porsi nyata, kandungan gizi, batas aman konsumsi, lalu memberi ulasan bintang.' },
  { icon: ShieldCheck, title: 'Laporan Siap SIPGN', desc: 'Semua data operasional harian terkompilasi otomatis menjadi laporan standar siap unggah ke SIPGN/BGN.' },
];

const COMPARISON = [
  { aspek: 'Peran', sipgn: 'Sistem pengawasan & pelaporan resmi pemerintah', nutri: 'Asisten operasional harian dapur vendor' },
  { aspek: 'Perencanaan menu AI + anggaran Rp 15.000/porsi', sipgn: false, nutri: true },
  { aspek: 'PO belanja pasar via WhatsApp otomatis', sipgn: false, nutri: true },
  { aspek: 'Audit foto QC + persetujuan Ahli Gizi', sipgn: false, nutri: true },
  { aspek: 'Stiker box + QR transparansi orang tua', sipgn: false, nutri: true },
  { aspek: 'Pelaporan resmi ke pemerintah', sipgn: true, nutri: 'Menyiapkan laporan siap unggah' },
];

const CountUp = ({ target, suffix = '' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span>{val.toLocaleString('id-ID')}{suffix}</span>;
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
};

export default function LandingPage() {
  const [metrics, setMetrics] = useState({ porsi_terdistribusi: 8750, kepatuhan_gizi: 98, hemat_waktu: 70, dapur_aktif: 12 });

  useEffect(() => {
    api.get('/public/impact-metrics').then((res) => setMetrics(res.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold">NutriDapur OS</span>
          </div>
          <Badge variant="outline" className="hidden md:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            <ShieldCheck className="h-3 w-3 mr-1" /> Built to Support BGN & SIPGN Standards — Operational OS for Kitchen Vendors
          </Badge>
          <div className="flex items-center gap-2">
            <Link to="/parent-portal">
              <Button variant="ghost" size="sm" data-testid="landing-parent-portal-link" className="hidden sm:inline-flex">Portal Orang Tua</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="landing-login-button">Masuk / Register</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient noise-overlay">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fadeUp}>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100 mb-4">
              Program Makan Bergizi Gratis (MBG)
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              Solusi Operasional Dapur MBG: <span className="text-primary">Dari AI Menu</span> Hingga Laporan Siap SIPGN
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              Bantu vendor katering mengelola anggaran Rp 15.000/porsi, otomatisasi PO pasar via WhatsApp, cetak stiker QR, dan setor laporan resmi tanpa ribet.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90" data-testid="landing-hero-primary-cta">
                  Coba Demo Gratis <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" data-testid="landing-hero-secondary-cta">Masuk / Register</Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Standar 4 Bintang BGN</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Format SIPGN Ready</span>
            </div>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="relative">
            <img src={HERO_IMG} alt="Dapur profesional MBG" className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3]" />
            <Card className="absolute -bottom-5 -left-3 sm:left-6 shadow-lg border-emerald-100">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">HPP Hari Ini: Rp 13.850/porsi</p>
                  <p className="text-xs text-muted-foreground">Di bawah target Rp 15.000 ✓</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: 'Porsi Terdistribusi', value: metrics.porsi_terdistribusi, suffix: '' },
            { icon: ShieldCheck, label: 'Kepatuhan Gizi', value: metrics.kepatuhan_gizi, suffix: '%' },
            { icon: Timer, label: 'Hemat Waktu Operasional', value: metrics.hemat_waktu, suffix: '%' },
            { icon: Building2, label: 'Dapur SP Aktif', value: metrics.dapur_aktif, suffix: '' },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
                <Card className="card-hover" data-testid={`impact-metric-${i}`}>
                  <CardContent className="p-5">
                    <Icon className="h-5 w-5 text-primary mb-2" />
                    <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums"><CountUp target={m.value} suffix={m.suffix} /></p>
                    <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SIPGN Comparison */}
      <section className="bg-slate-50 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <motion.div {...fadeUp} className="max-w-2xl">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mb-3">Ekosistem Pelengkap SIPGN</Badge>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Bukan Pengganti — Pelengkap Operasional SIPGN</h2>
            <p className="mt-3 text-slate-600">
              Jika <strong>SIPGN BGN</strong> adalah sistem pengawasan resmi pemerintah, <strong>NutriDapur OS</strong> adalah asisten harian dapur vendor untuk eksekusi operasional, efisiensi bahan baku pasar, dan otomatisasi laporan.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="mt-8 rounded-xl border bg-white overflow-hidden overflow-x-auto">
            <Table data-testid="sipgn-comparison-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[200px]">Aspek</TableHead>
                  <TableHead>SIPGN (BGN)</TableHead>
                  <TableHead className="text-emerald-700">NutriDapur OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{row.aspek}</TableCell>
                    <TableCell className="text-sm">
                      {row.sipgn === true ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : row.sipgn === false ? <XCircle className="h-4 w-4 text-slate-300" /> : <span className="text-slate-600">{row.sipgn}</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.nutri === true ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : row.nutri === false ? <XCircle className="h-4 w-4 text-slate-300" /> : <span className="text-emerald-700 font-medium">{row.nutri}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </section>

      {/* Feature Bento */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <motion.div {...fadeUp} className="text-left max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">Semua Kebutuhan Operasional Dapur MBG</h2>
          <p className="mt-2 text-slate-600">Dari perencanaan menu hingga transparansi orang tua — dalam satu sistem.</p>
        </motion.div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}>
                <Card className="card-hover h-full" data-testid={`feature-card-${i}`}>
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <motion.div {...fadeUp}>
          <Card className="bg-primary text-white border-0">
            <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Siap Mengelola Dapur MBG Tanpa Ribet?</h2>
                <p className="mt-2 text-emerald-50">Coba demo gratis dengan 1 klik — tanpa kartu kredit, tanpa instalasi.</p>
              </div>
              <Link to="/login">
                <Button size="lg" variant="secondary" className="bg-white text-emerald-700 hover:bg-emerald-50 shrink-0" data-testid="landing-bottom-cta">
                  Coba Demo Gratis <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© 2025 NutriDapur OS — Mendukung Program Makan Bergizi Gratis Indonesia</span>
          <span>Dibangun untuk mendukung standar BGN & SIPGN</span>
        </div>
      </footer>
    </div>
  );
}
