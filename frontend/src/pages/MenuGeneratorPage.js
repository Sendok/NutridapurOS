import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api, fmtRp } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Lock, Flame, Beef, Wheat, Droplets, CheckCircle2, Zap } from 'lucide-react';

const BAHAN_LOKAL = ['Ikan Lele', 'Ayam', 'Tempe', 'Tahu', 'Telur', 'Bayam', 'Kangkung', 'Wortel', 'Buncis', 'Pisang', 'Jeruk', 'Semangka', 'Pepaya'];

const TIPE_STYLE = {
  'Ekonomis': 'bg-sky-50 text-sky-700 border-sky-200',
  'Seimbang': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'High-Protein': 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function MenuGeneratorPage() {
  const [form, setForm] = useState({ budget_per_porsi: 15000, porsi_target: 500, age_group: 'SD' });
  const [bahan, setBahan] = useState(['Ayam', 'Tempe', 'Telur', 'Bayam', 'Pisang']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lockingIdx, setLockingIdx] = useState(null);
  const [lockedIdx, setLockedIdx] = useState(null);

  const toggleBahan = (b) => {
    setBahan((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setLockedIdx(null);
    try {
      const res = await api.post('/ai/generate-menu', { ...form, bahan_lokal: bahan });
      setResult(res.data);
      if (res.data.fallback_used) {
        toast.warning('Menggunakan Template Menu Teroptimasi (Mode Cepat)', {
          description: 'AI sedang sibuk — menu berkualitas dari pustaka lokal ditampilkan.',
        });
      } else {
        toast.success('AI berhasil menyusun 3 opsi menu!', { description: 'Ditenagai OpenRouter • MiniMax M3' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal membuat menu. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const lockMenu = async (menu, idx) => {
    setLockingIdx(idx);
    try {
      await api.post('/menus/lock', {
        menu,
        age_group: result.age_group,
        porsi_target: result.porsi_target,
        budget_per_porsi: result.budget_per_porsi,
      });
      setLockedIdx(idx);
      toast.success(`Menu "${menu.nama_menu}" dikunci untuk produksi hari ini!`, {
        description: 'Daftar belanja pasar otomatis diperbarui di halaman Belanja & PO.',
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal mengunci menu.');
    } finally {
      setLockingIdx(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">AI Menu & Nutrition Generator</h1>
        <p className="text-sm text-muted-foreground">AI menyusun 3 opsi menu sesuai budget & standar 4 Bintang BGN. Jika AI lambat (&gt;8 detik), template teroptimasi otomatis digunakan.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form */}
        <Card className="lg:col-span-1 h-fit lg:sticky lg:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Parameter Menu</CardTitle>
            <CardDescription>Sesuaikan dengan kondisi dapur Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="budget">Budget per Porsi (Rp)</Label>
              <Input id="budget" type="number" min={5000} step={500} value={form.budget_per_porsi}
                onChange={(e) => setForm({ ...form, budget_per_porsi: Number(e.target.value) })}
                data-testid="menu-budget-input" className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">Standar MBG: Rp 15.000/porsi</p>
            </div>
            <div>
              <Label htmlFor="porsi">Total Target Porsi</Label>
              <Input id="porsi" type="number" min={10} value={form.porsi_target}
                onChange={(e) => setForm({ ...form, porsi_target: Number(e.target.value) })}
                data-testid="menu-porsi-input" className="mt-1" />
            </div>
            <div>
              <Label>Kelompok Usia</Label>
              <Select value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                <SelectTrigger className="mt-1" data-testid="menu-age-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD (7-12 tahun)</SelectItem>
                  <SelectItem value="SMP">SMP (13-15 tahun)</SelectItem>
                  <SelectItem value="SMA">SMA (16-18 tahun)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bahan Lokal Tersedia di Pasar</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BAHAN_LOKAL.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={bahan.includes(b)} onCheckedChange={() => toggleBahan(b)} data-testid={`menu-bahan-${b.toLowerCase().replace(/ /g, '-')}`} />
                    {b}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={generate} disabled={loading} className="w-full bg-primary hover:bg-primary/90" data-testid="menu-generator-submit-button">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI sedang menyusun menu...</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generate 3 Opsi Menu</>)}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <Card>
              <CardContent className="py-14 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="mt-4 font-medium">AI sedang menganalisis gizi & harga pasar...</p>
                <p className="text-sm text-muted-foreground mt-1">Maksimal 8 detik — jika lambat, template teroptimasi otomatis digunakan.</p>
              </CardContent>
            </Card>
          )}

          {!loading && !result && (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-slate-300" />
                <p className="mt-3 text-sm text-muted-foreground">Atur parameter di samping lalu klik <strong>Generate</strong>.<br />AI akan menyusun opsi Ekonomis, Seimbang, dan High-Protein.</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {result.fallback_used ? (
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50" data-testid="menu-fallback-badge">
                    <Zap className="h-3 w-3 mr-1" /> Template Menu Teroptimasi (Mode Cepat)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50" data-testid="menu-ai-badge">
                    <Sparkles className="h-3 w-3 mr-1" /> Hasil AI Langsung • MiniMax M3
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{result.porsi_target?.toLocaleString('id-ID')} porsi • {result.age_group} • budget {fmtRp(result.budget_per_porsi)}</span>
              </div>

              {result.menus.map((menu, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <Card className={`card-hover ${lockedIdx === idx ? 'ring-2 ring-primary' : ''}`} data-testid={`menu-result-card-${idx}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <Badge variant="outline" className={TIPE_STYLE[menu.tipe] || 'bg-slate-50'}>{menu.tipe}</Badge>
                          <CardTitle className="text-lg font-display mt-2">{menu.nama_menu}</CardTitle>
                          {menu.deskripsi && <CardDescription className="mt-1">{menu.deskripsi}</CardDescription>}
                        </div>
                        <div className="text-right">
                          <p className="font-display text-xl font-bold tabular-nums">{fmtRp(menu.total_biaya)}</p>
                          <p className="text-[11px] text-muted-foreground">per porsi</p>
                          {menu.bgn_compliant ? (
                            <Badge className="mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> Sesuai Standar BGN
                            </Badge>
                          ) : (
                            <Badge className="mt-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 text-[10px]">Perlu Review Gizi</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Items */}
                      <div className="space-y-1.5">
                        {(menu.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{item.nama}</span>
                            <span className="tabular-nums text-muted-foreground">{fmtRp(item.harga)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-3" />
                      {/* Gizi */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { icon: Flame, label: 'Kalori', val: `${menu.gizi?.kalori || 0}`, unit: 'kkal', color: 'text-orange-500' },
                          { icon: Beef, label: 'Protein', val: `${menu.gizi?.protein_g || 0}`, unit: 'g', color: 'text-rose-500' },
                          { icon: Wheat, label: 'Karbo', val: `${menu.gizi?.karbohidrat_g || 0}`, unit: 'g', color: 'text-amber-500' },
                          { icon: Droplets, label: 'Lemak', val: `${menu.gizi?.lemak_g || 0}`, unit: 'g', color: 'text-sky-500' },
                        ].map((g, i) => {
                          const GIcon = g.icon;
                          return (
                            <div key={i} className="rounded-lg bg-slate-50 p-2.5 text-center">
                              <GIcon className={`h-4 w-4 mx-auto ${g.color}`} />
                              <p className="font-display font-bold text-sm mt-1 tabular-nums">{g.val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{g.unit}</span></p>
                              <p className="text-[10px] text-muted-foreground">{g.label}</p>
                            </div>
                          );
                        })}
                      </div>
                      {/* Alergen */}
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {(menu.alergen || []).map((a, i) => (
                          <Badge key={i} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px]">⚠ Mengandung: {a}</Badge>
                        ))}
                        {(menu.bebas_alergen || []).length > 0 && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">✓ Bebas: {(menu.bebas_alergen || []).join(', ')}</Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => lockMenu(menu, idx)}
                        disabled={lockingIdx !== null || lockedIdx === idx}
                        className={`w-full mt-4 ${lockedIdx === idx ? 'bg-emerald-600' : 'bg-primary hover:bg-primary/90'}`}
                        data-testid={`menu-lock-button-${idx}`}
                      >
                        {lockingIdx === idx ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                        {lockedIdx === idx ? 'Menu Terkunci untuk Produksi ✓' : 'Kunci Menu Ini untuk Produksi'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
