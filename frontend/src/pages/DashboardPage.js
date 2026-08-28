import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, fmtRp } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { UtensilsCrossed, Wallet, ShieldCheck, Star, FileUp, Sparkles, ArrowRight } from 'lucide-react';

const GIZI_COLORS = ['#0ea5e9', '#16a34a', '#f59e0b'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Porsi Hari Ini', value: (data?.total_porsi_hari_ini || 0).toLocaleString('id-ID'), sub: 'porsi terjadwal', icon: UtensilsCrossed, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rata-Rata HPP/Porsi', value: fmtRp(data?.hpp_per_porsi || 0), sub: `Target: ${fmtRp(15000)}`, icon: Wallet, color: 'text-sky-600 bg-sky-50', ok: (data?.hpp_per_porsi || 0) <= 15000 },
    { label: 'Skor Kepatuhan Gizi', value: `${data?.skor_gizi || 0}%`, sub: 'standar 4 Bintang BGN', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rating Kepuasan Orang Tua', value: `${data?.rating_orang_tua || 0} ★`, sub: `${data?.total_ulasan || 0} ulasan masuk`, icon: Star, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard Operasional</h1>
          <p className="text-sm text-muted-foreground">Ringkasan harian {user?.dapur || 'Dapur SP MBG Katering Sukajadi'}</p>
        </div>
        <Badge
          data-testid="sipgn-status-badge"
          className={data?.sipgn_ready
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5'
            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 px-3 py-1.5'}
        >
          <FileUp className="h-3.5 w-3.5 mr-1.5" />
          Status SIPGN: {data?.sipgn_ready ? 'Ready to Upload' : 'Menunggu QC & Menu'}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="card-hover h-full" data-testid={`stat-card-${i}`}>
                <CardContent className="p-4 sm:p-5">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </div>
                  <p className="font-display text-xl sm:text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3" data-testid="dashboard-budget-actual-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Anggaran vs Pengeluaran Aktual (7 Hari)</CardTitle>
            <CardDescription>Perbandingan budget harian dengan realisasi belanja</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.chart_budget || []}>
                <defs>
                  <linearGradient id="gBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${Math.round(v / 1000000)}jt`} width={40} />
                <ChartTooltip formatter={(v, name) => [fmtRp(v), name === 'budget' ? 'Anggaran' : 'Aktual']} />
                <Area type="monotone" dataKey="budget" stroke="#0ea5e9" strokeWidth={2} fill="url(#gBudget)" name="budget" />
                <Area type="monotone" dataKey="aktual" stroke="#16a34a" strokeWidth={2} fill="url(#gActual)" name="aktual" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="dashboard-nutrition-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Distribusi Gizi Menu Hari Ini</CardTitle>
            <CardDescription>{data?.kalori_menu || 0} kkal total per porsi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data?.chart_gizi || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {(data?.chart_gizi || []).map((_, i) => <Cell key={i} fill={GIZI_COLORS[i % GIZI_COLORS.length]} />)}
                </Pie>
                <ChartTooltip formatter={(v, name) => [`${v} g`, name]} />
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Menu hari ini */}
      <Card data-testid="dashboard-menu-today">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-display">Menu Terkunci Hari Ini</CardTitle>
            <CardDescription>Menu yang sedang diproduksi dapur</CardDescription>
          </div>
          {['admin', 'gizi'].includes(user?.role) && (
            <Link to="/menu-generator">
              <Button variant="outline" size="sm" data-testid="dashboard-to-menu-generator">
                <Sparkles className="h-4 w-4 mr-1.5" /> Buat Menu Baru
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {data?.menu_today ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{data.menu_today.nama_menu}</h3>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">{data.menu_today.tipe}</Badge>
                  {data.menu_today.bgn_compliant && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">✓ Sesuai Standar BGN</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {(data.menu_today.items || []).map((i) => i.nama).join(' • ')}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(data.menu_today.alergen || []).map((a, i) => (
                    <Badge key={i} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px]">⚠ {a}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="font-display text-xl font-bold tabular-nums">{fmtRp(data.menu_today.total_biaya)}</p>
                <p className="text-xs text-muted-foreground">per porsi • {data.menu_today.porsi_target?.toLocaleString('id-ID')} porsi</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Belum ada menu terkunci untuk hari ini.</p>
              {['admin', 'gizi'].includes(user?.role) && (
                <Link to="/menu-generator">
                  <Button size="sm" className="mt-3 bg-primary" data-testid="dashboard-empty-menu-cta">
                    Buat Menu dengan AI <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
