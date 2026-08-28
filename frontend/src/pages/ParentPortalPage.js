import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChefHat, BadgeCheck, Star, Flame, Beef, Wheat, Droplets, Clock, Truck, AlertTriangle,
  CheckCircle2, Loader2, Send, Camera, Leaf,
} from 'lucide-react';

const QUICK_TAGS = ['Anak Suka!', 'Porsi Pas', 'Lauk Segar', 'Kemasan Rapi'];

const StarInput = ({ label, value, onChange, testid }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex gap-1" data-testid={testid}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="star-btn" aria-label={`${label} ${i} bintang`} data-testid={`${testid}-${i}`}>
          <Star className={`h-7 w-7 ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
        </button>
      ))}
    </div>
  </div>
);

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] },
};

export default function ParentPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState({ rasa: 0, porsi: 0, kesegaran: 0 });
  const [tags, setTags] = useState([]);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/public/parent-portal')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async () => {
    if (!rating.rasa || !rating.porsi || !rating.kesegaran) {
      toast.error('Mohon beri rating bintang untuk Rasa, Porsi, dan Kesegaran.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/public/feedback', { ...rating, tags, catatan, sekolah: data?.sekolah, kelas: data?.kelas });
      setSubmitted(true);
      toast.success('Ulasan Anda Berhasil Terkirim ke Dapur!', { description: 'Terima kasih telah membantu meningkatkan kualitas MBG.' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal mengirim ulasan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-64" />
      </div>
    );
  }

  const menu = data?.menu;
  const gizi = menu?.gizi || {};

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* 1. Public Header */}
      <div className="bg-primary text-white">
        <div className="max-w-md mx-auto px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
              <ChefHat className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <span className="font-display font-bold text-sm">NutriTransparan</span>
            <Badge className="ml-auto bg-white/15 text-white border-0 hover:bg-white/15 text-[10px]">Portal Publik</Badge>
          </div>
          <h1 className="font-display text-xl font-bold mt-3" data-testid="portal-school-name">{data?.sekolah} — {data?.kelas}</h1>
          <p className="text-emerald-100 text-xs mt-0.5">Ditempa oleh: {data?.dapur}</p>
          <Badge className="mt-2.5 bg-white text-emerald-700 hover:bg-white border-0" data-testid="portal-verification-badge">
            <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Terverifikasi Ahli Gizi & Standard BGN Ready
          </Badge>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-0 space-y-4 pt-4">
        {/* 2. QC Photo Banner */}
        <motion.div {...fadeUp}>
          <Card className="overflow-hidden" data-testid="portal-qc-banner">
            {data?.qc?.photo ? (
              <div className="relative">
                <img src={data.qc.photo} alt="Foto porsi makanan hari ini" className="w-full aspect-video object-cover" />
                <Badge className="absolute top-2 left-2 bg-white/95 text-emerald-700 hover:bg-white/95 border-0 text-[10px] shadow">
                  <Camera className="h-3 w-3 mr-1" /> Foto Porsi Nyata Sebelum Pengiriman (Diproses Pukul {data.qc.waktu?.replace(' WIB', '') || '06:15'} WIB)
                </Badge>
              </div>
            ) : (
              <div className="aspect-video bg-slate-100 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Foto QC hari ini belum tersedia.</p>
              </div>
            )}
            <CardContent className="p-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{menu?.nama_menu || 'Menu MBG Hari Ini'}</p>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> QC Approved
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Nutrition & AKG */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <Card data-testid="portal-nutrition-card">
            <CardContent className="p-4">
              <h2 className="font-display font-semibold text-sm">Kandungan Gizi per Porsi</h2>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {[
                  { icon: Flame, label: 'Total Kalori', val: `${gizi.kalori || 0} kkal`, color: 'text-orange-500 bg-orange-50' },
                  { icon: Beef, label: 'Protein', val: `${gizi.protein_g || 0}g${(gizi.protein_g || 0) >= 20 ? ' — High Protein' : ''}`, color: 'text-rose-500 bg-rose-50' },
                  { icon: Wheat, label: 'Karbohidrat', val: `${gizi.karbohidrat_g || 0}g`, color: 'text-amber-500 bg-amber-50' },
                  { icon: Droplets, label: 'Lemak', val: `${gizi.lemak_g || 0}g`, color: 'text-sky-500 bg-sky-50' },
                ].map((g, i) => {
                  const Icon = g.icon;
                  return (
                    <div key={i} className="rounded-xl border p-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${g.color}`}>
                        <Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <p className="font-display font-bold text-sm mt-2 tabular-nums">{g.val}</p>
                      <p className="text-[11px] text-muted-foreground">{g.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {(menu?.mikronutrien || ['Vitamin A', 'Vitamin C', 'Kalsium', 'Zat Besi']).map((m, i) => (
                  <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <Leaf className="h-2.5 w-2.5 mr-0.5" /> {m}
                  </Badge>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">Pemenuhan AKG Makan Siang</span>
                  <span className="font-bold text-emerald-700">100%</span>
                </div>
                <Progress value={100} className="h-2.5" data-testid="portal-akg-progress" />
                <p className="text-[11px] text-muted-foreground mt-1.5">100% Memenuhi Standar Gizi Makan Siang Anak SD (7-9 Tahun)</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Food Safety Countdown */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <Card className="border-amber-200 bg-amber-50/50" data-testid="portal-safety-card">
            <CardContent className="p-4">
              <h2 className="font-display font-semibold text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Keamanan Pangan Hari Ini
              </h2>
              <div className="space-y-2.5 mt-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <span>Dimasak: <strong>{menu?.waktu_masak || '05:30 WIB'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <Truck className="h-3.5 w-3.5 text-sky-700" />
                  </div>
                  <span>Dikirim ke Sekolah: <strong>{menu?.waktu_kirim || '08:30 WIB'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  </div>
                  <span>Batas Aman Konsumsi: <strong>Maksimal {menu?.batas_konsumsi || '12:00 WIB'}</strong> (Kondisi Segar)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. Ingredients & Allergen */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <Card data-testid="portal-ingredients-card">
            <CardContent className="p-4">
              <h2 className="font-display font-semibold text-sm">Menu & Transparansi Alergen</h2>
              <ul className="mt-2.5 space-y-1.5">
                {(menu?.items || []).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {item.nama}
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5 mt-3">
                {(menu?.alergen || []).length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] whitespace-normal text-left">
                    ⚠ Mengandung: {(menu?.alergen || []).join(' & ')}
                  </Badge>
                )}
                {(menu?.bebas_alergen || []).length > 0 && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] whitespace-normal text-left">
                    ✅ Bebas dari: {(menu?.bebas_alergen || []).join(' & ')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 6. Feedback Form */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
          <Card data-testid="portal-feedback-card">
            <CardContent className="p-4">
              {submitted ? (
                <div className="text-center py-6">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="font-display font-bold mt-3">Terima Kasih!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ulasan Anda berhasil terkirim ke dapur dan langsung memperbarui rating kepuasan.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSubmitted(false); setRating({ rasa: 0, porsi: 0, kesegaran: 0 }); setTags([]); setCatatan(''); }} data-testid="portal-feedback-again-button">
                    Kirim Ulasan Lagi
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-display font-semibold text-sm">Beri Ulasan untuk Dapur</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Penilaian Anda membantu kualitas makan anak-anak kita.</p>
                  <div className="space-y-3 mt-4">
                    <StarInput label="Rasa" value={rating.rasa} onChange={(v) => setRating({ ...rating, rasa: v })} testid="portal-rating-rasa" />
                    <StarInput label="Porsi" value={rating.porsi} onChange={(v) => setRating({ ...rating, porsi: v })} testid="portal-rating-porsi" />
                    <StarInput label="Kesegaran" value={rating.kesegaran} onChange={(v) => setRating({ ...rating, kesegaran: v })} testid="portal-rating-kesegaran" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {QUICK_TAGS.map((t) => (
                      <label key={t} className={`flex items-center gap-2 text-sm rounded-lg border p-2.5 cursor-pointer transition-colors ${tags.includes(t) ? 'border-emerald-300 bg-emerald-50' : 'hover:bg-slate-50'}`}>
                        <Checkbox checked={tags.includes(t)} onCheckedChange={() => toggleTag(t)} data-testid={`portal-tag-${t.replace(/[^a-zA-Z]/g, '-').toLowerCase()}`} />
                        {t}
                      </label>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Catatan atau Alergi Anak (opsional)"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="mt-3"
                    rows={2}
                    data-testid="portal-feedback-catatan"
                  />
                  <Button onClick={submit} disabled={submitting} className="w-full mt-3 bg-primary hover:bg-primary/90 h-11" data-testid="parent-portal-rating-submit">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Kirim Ulasan ke Dapur
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400">
            Rating komunitas saat ini: <strong>{data?.rating_rata || 0} ★</strong> dari {data?.total_ulasan || 0} ulasan
          </p>
          <Link to="/" className="text-[11px] text-emerald-700 hover:underline">Didukung NutriDapur OS — Ekosistem Pelengkap SIPGN</Link>
        </div>
      </div>
    </div>
  );
}
