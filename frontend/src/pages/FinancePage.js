import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { api, fmtRp, API } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Wallet, TrendingUp, Percent, FileUp, Printer, Loader2, CheckCircle2, FileSpreadsheet, CalendarDays, X } from 'lucide-react';

const toYmd = (d) => (d ? format(d, 'yyyy-MM-dd') : null);

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [range, setRange] = useState(undefined); // {from, to}
  const [pickerOpen, setPickerOpen] = useState(false);

  const startStr = toYmd(range?.from);
  const endStr = toYmd(range?.to || range?.from);
  const rangeQuery = startStr && endStr ? `?start=${startStr}&end=${endStr}` : '';

  const fetchData = useCallback((s, e) => {
    const q = s && e ? `?start=${s}&end=${e}` : '';
    setLoading(true);
    api.get(`/finance/pnl${q}`)
      .then((res) => setData(res.data))
      .catch(() => toast.error('Gagal memuat data keuangan.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(null, null);
  }, [fetchData]);

  const applyRange = (r) => {
    setRange(r);
    if (r?.from && r?.to) {
      fetchData(toYmd(r.from), toYmd(r.to));
      setPickerOpen(false);
    } else if (!r) {
      fetchData(null, null);
    }
  };

  const applyPreset = (days) => {
    const max = data?.available_max ? new Date(data.available_max + 'T00:00:00') : new Date();
    const from = new Date(max);
    from.setDate(from.getDate() - (days - 1));
    applyRange({ from, to: max });
  };

  const clearRange = () => {
    setRange(undefined);
    fetchData(null, null);
    setPickerOpen(false);
  };

  const rangeLabel = startStr && endStr
    ? `${format(range.from, 'd MMM', { locale: localeID })} – ${format(range.to || range.from, 'd MMM yyyy', { locale: localeID })}`
    : 'Semua Periode';

  const exportSipgn = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/reports/sipgn-export${rangeQuery}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-sipgn-bgn-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Laporan PDF SIPGN/BGN berhasil diunduh!', { description: 'Dokumen PDF rapi siap diunggah ke sistem resmi SIPGN.' });
    } catch {
      toast.error('Gagal mengekspor laporan SIPGN.');
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await api.get(`/reports/finance-excel${rangeQuery}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-keuangan-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Rekap keuangan Excel berhasil diunduh!', { description: 'File .xlsx berisi rincian harian & ringkasan P&L.' });
    } catch {
      toast.error('Gagal mengekspor rekap Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  const printPreview = async () => {
    setPreviewing(true);
    try {
      const res = await api.get(`/reports/sipgn-export${rangeQuery}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const win = window.open(url, '_blank');
      if (!win) {
        toast.error('Pop-up diblokir. Izinkan pop-up untuk melihat pratinjau PDF.');
      } else {
        toast.success('Pratinjau PDF dibuka di tab baru.', { description: 'Anda dapat mencetak langsung dari tab tersebut.' });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Gagal membuka pratinjau PDF.');
    } finally {
      setPreviewing(false);
    }
  };

  if (loading && !data) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  const periodeKpiLabel = startStr ? 'Total Anggaran (Periode)' : 'Total Anggaran (7 Hari)';
  const kpis = [
    { label: periodeKpiLabel, value: fmtRp(data?.total_budget || 0), icon: Wallet, color: 'text-sky-600 bg-sky-50' },
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
        <div className="flex flex-wrap gap-2 no-print">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={startStr ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : ''} data-testid="finance-date-range-button">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                {rangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" data-testid="finance-date-range-popover">
              <div className="flex flex-col sm:flex-row">
                <div className="flex sm:flex-col gap-1 p-3 border-b sm:border-b-0 sm:border-r min-w-[150px]">
                  <p className="text-xs font-semibold text-muted-foreground px-1 pb-1 hidden sm:block">Pilihan Cepat</p>
                  <Button variant="ghost" size="sm" className="justify-start text-sm" onClick={() => applyPreset(7)} data-testid="preset-7">7 Hari Terakhir</Button>
                  <Button variant="ghost" size="sm" className="justify-start text-sm" onClick={() => applyPreset(30)} data-testid="preset-30">30 Hari Terakhir</Button>
                  <Button variant="ghost" size="sm" className="justify-start text-sm text-emerald-700" onClick={clearRange} data-testid="preset-all">
                    <X className="h-3.5 w-3.5 mr-1" /> Semua Periode
                  </Button>
                </div>
                <div>
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={applyRange}
                    numberOfMonths={1}
                    defaultMonth={data?.available_max ? new Date(data.available_max + 'T00:00:00') : undefined}
                    locale={localeID}
                    data-testid="finance-range-calendar"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Separator orientation="vertical" className="h-9 hidden sm:block" />
          <Button variant="outline" onClick={printPreview} disabled={previewing} data-testid="finance-print-preview-button">
            {previewing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Printer className="h-4 w-4 mr-1.5" />}
            Pratinjau PDF Laporan
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={exportingExcel} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" data-testid="finance-excel-export-button">
            {exportingExcel ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1.5" />}
            Unduh Excel (.xlsx)
          </Button>
          <Button onClick={exportSipgn} disabled={exporting} className="bg-primary hover:bg-primary/90" data-testid="finance-sipgn-export-button">
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileUp className="h-4 w-4 mr-1.5" />}
            Unduh PDF Laporan SIPGN / BGN
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
