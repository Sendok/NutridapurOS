import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, fmtRp, API } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, Percent, FileUp, Printer, Loader2, CheckCircle2 } from 'lucide-react';

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/finance/pnl')
      .then((res) => setData(res.data))
      .catch(() => toast.error('Gagal memuat data keuangan.'))
      .finally(() => setLoading(false));
  }, []);

  const exportSipgn = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/sipgn-export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-sipgn-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Laporan SIPGN/BGN berhasil diekspor!', { description: 'File siap diunggah ke sistem resmi SIPGN.' });
    } catch {
      toast.error('Gagal mengekspor laporan SIPGN.');
    } finally {
      setExporting(false);
    }
  };

  const printPreview = () => {
    toast.info('Membuka print preview laporan...');
    setTimeout(() => window.print(), 400);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  const kpis = [
    { label: 'Total Anggaran (7 Hari)', value: fmtRp(data?.total_budget || 0), icon: Wallet, color: 'text-sky-600 bg-sky-50' },
    { label: 'Total Realisasi', value: fmtRp(data?.total_aktual || 0), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Margin Operasional', value: `${fmtRp(data?.total_margin || 0)} (${data?.margin_persen || 0}%)`, icon: Percent, color: 'text-amber-600 bg-amber-50' },
    { label: 'HPP Rata-rata/Porsi', value: fmtRp(data?.hpp_rata || 0), icon: CheckCircle2, color: (data?.hpp_rata || 0) <= 15000 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Keuangan P&L & Laporan SIPGN</h1>
          <p className="text-sm text-muted-foreground">Biaya operasional harian dan kepatuhan anggaran Rp 15.000/porsi.</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={printPreview} data-testid="finance-print-preview-button">
            <Printer className="h-4 w-4 mr-1.5" /> Print Preview Laporan PDF
          </Button>
          <Button onClick={exportSipgn} disabled={exporting} className="bg-primary hover:bg-primary/90" data-testid="finance-sipgn-export-button">
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileUp className="h-4 w-4 mr-1.5" />}
            Ekspor Format Laporan SIPGN / BGN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i} className="card-hover" data-testid={`finance-kpi-${i}`}>
              <CardContent className="p-4 sm:p-5">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <p className="font-display text-base sm:text-lg font-bold tabular-nums leading-tight">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-display">Tabel Biaya Operasional Harian</CardTitle>
              <CardDescription>Rincian bahan pangan, gas/listrik, kemasan, dan tenaga kerja</CardDescription>
            </div>
            <Badge
              data-testid="budget-compliance-badge"
              className={(data?.budget_compliance || 0) <= 100
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50'}
            >
              Kepatuhan Anggaran: {data?.budget_compliance || 0}% dari budget
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="finance-pnl-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Porsi</TableHead>
                  <TableHead className="text-right">Bahan Pangan</TableHead>
                  <TableHead className="text-right">Gas/Listrik</TableHead>
                  <TableHead className="text-right">Kemasan</TableHead>
                  <TableHead className="text-right">Tenaga Kerja</TableHead>
                  <TableHead className="text-right">HPP/Porsi</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium">{r.hari}</p>
                      <p className="text-xs text-muted-foreground">{r.tanggal}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.porsi.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtRp(r.bahan_pangan)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtRp(r.gas_listrik)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtRp(r.kemasan)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtRp(r.tenaga_kerja)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      <span className={r.hpp_per_porsi <= 15000 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                        {fmtRp(r.hpp_per_porsi)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">{fmtRp(r.margin)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{(data?.total_porsi || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell colSpan={4} className="text-right tabular-nums">{fmtRp(data?.total_aktual || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtRp(data?.hpp_rata || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{fmtRp(data?.total_margin || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
