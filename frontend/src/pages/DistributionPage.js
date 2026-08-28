import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Printer, Plus, ChefHat, Flame, Beef, Wheat, Droplets, AlertTriangle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  in_kitchen: { label: 'Di Dapur', cls: 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100' },
  on_delivery: { label: 'Dalam Pengiriman', cls: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50' },
  delivered: { label: 'Terkirim \u2713', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
};

export default function DistributionPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [labelTarget, setLabelTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDelivery, setNewDelivery] = useState({ sekolah: '', kelas: '', jumlah_box: 100, target_waktu: '09:00 WIB', driver: '' });

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const [dRes, mRes] = await Promise.all([api.get('/deliveries'), api.get('/menus/today')]);
      setDeliveries(dRes.data);
      setMenu(mRes.data);
    } catch {
      toast.error('Gagal memuat data distribusi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/deliveries/${id}/status`, { status });
      toast.success(`Status pengiriman diperbarui: ${STATUS_CONFIG[status].label}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal memperbarui status.');
    }
  };

  const addDelivery = async (e) => {
    e.preventDefault();
    try {
      await api.post('/deliveries', newDelivery);
      toast.success(`Jadwal pengiriman ke ${newDelivery.sekolah} ditambahkan!`);
      setAddOpen(false);
      setNewDelivery({ sekolah: '', kelas: '', jumlah_box: 100, target_waktu: '09:00 WIB', driver: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menambah pengiriman.');
    }
  };

  const printLabel = () => {
    window.print();
    toast.success('Label dikirim ke printer!');
  };

  const parentPortalUrl = `${window.location.origin}/parent-portal`;

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Distribusi & Label Box</h1>
          <p className="text-sm text-muted-foreground">Pantau pengiriman per sekolah dan cetak stiker box dengan QR transparansi.</p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary" data-testid="add-delivery-button"><Plus className="h-4 w-4 mr-1.5" /> Tambah Pengiriman</Button>
            </DialogTrigger>
            <DialogContent data-testid="add-delivery-dialog">
              <DialogHeader>
                <DialogTitle className="font-display">Tambah Jadwal Pengiriman</DialogTitle>
                <DialogDescription>Daftarkan sekolah tujuan distribusi</DialogDescription>
              </DialogHeader>
              <form onSubmit={addDelivery} className="space-y-3">
                <div>
                  <Label>Nama Sekolah</Label>
                  <Input required placeholder="cth: SD Negeri 3 Sukajadi" value={newDelivery.sekolah}
                    onChange={(e) => setNewDelivery({ ...newDelivery, sekolah: e.target.value })} data-testid="delivery-sekolah-input" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kelas</Label>
                    <Input placeholder="Kelas 1-6" value={newDelivery.kelas}
                      onChange={(e) => setNewDelivery({ ...newDelivery, kelas: e.target.value })} data-testid="delivery-kelas-input" className="mt-1" />
                  </div>
                  <div>
                    <Label>Jumlah Box</Label>
                    <Input type="number" min={1} required value={newDelivery.jumlah_box}
                      onChange={(e) => setNewDelivery({ ...newDelivery, jumlah_box: Number(e.target.value) })} data-testid="delivery-box-input" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Target Waktu</Label>
                    <Input required placeholder="09:00 WIB" value={newDelivery.target_waktu}
                      onChange={(e) => setNewDelivery({ ...newDelivery, target_waktu: e.target.value })} data-testid="delivery-waktu-input" className="mt-1" />
                  </div>
                  <div>
                    <Label>Driver</Label>
                    <Input placeholder="Pak Asep" value={newDelivery.driver}
                      onChange={(e) => setNewDelivery({ ...newDelivery, driver: e.target.value })} data-testid="delivery-driver-input" className="mt-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary" data-testid="delivery-save-button">Simpan Jadwal</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Delivery Tracker Hari Ini
          </CardTitle>
          <CardDescription>Total {deliveries.reduce((s, d) => s + (d.jumlah_box || 0), 0).toLocaleString('id-ID')} box terjadwal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="delivery-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Sekolah Tujuan</TableHead>
                  <TableHead>Box</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => {
                  const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.in_kitchen;
                  return (
                    <TableRow key={d.id} data-testid={`delivery-row-${d.id}`}>
                      <TableCell>
                        <p className="font-medium text-sm">{d.sekolah}</p>
                        <p className="text-xs text-muted-foreground">{d.kelas}</p>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{d.jumlah_box}</TableCell>
                      <TableCell className="text-sm">{d.target_waktu}</TableCell>
                      <TableCell className="text-sm">{d.driver || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${sc.cls} text-[11px]`}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                            <SelectTrigger className="h-8 w-[150px] text-xs" data-testid={`delivery-status-select-${d.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_kitchen">Di Dapur</SelectItem>
                              <SelectItem value="on_delivery">Dalam Pengiriman</SelectItem>
                              <SelectItem value="delivered">Terkirim</SelectItem>
                            </SelectContent>
                          </Select>
                          {isAdmin && (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => setLabelTarget(d)} data-testid={`distribution-print-label-button-${d.id}`}>
                              <Printer className="h-3.5 w-3.5 mr-1" /> Label
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Label Modal */}
      <Dialog open={!!labelTarget} onOpenChange={(o) => !o && setLabelTarget(null)}>
        <DialogContent className="sm:max-w-md" data-testid="label-print-modal">
          <DialogHeader className="no-print">
            <DialogTitle className="font-display">Stiker Label Box Makanan</DialogTitle>
            <DialogDescription>Preview label — QR mengarah ke Portal Orang Tua (NutriTransparan)</DialogDescription>
          </DialogHeader>
          {labelTarget && (
            <div className="print-area rounded-xl border-2 border-emerald-600 p-4 bg-white">
              <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-7 w-7 rounded bg-emerald-600 flex items-center justify-center">
                    <ChefHat className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm leading-none">NutriDapur OS</p>
                    <p className="text-[9px] text-slate-500">Program Makan Bergizi Gratis</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[9px]">\u2713 BGN Ready</Badge>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1 space-y-1.5">
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-semibold">Sekolah Tujuan</p>
                    <p className="font-bold text-sm leading-tight">{labelTarget.sekolah}</p>
                    <p className="text-[10px] text-slate-500">{labelTarget.kelas}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600">
                    <Clock className="h-3 w-3" /> Dimasak: {menu?.waktu_masak || '05:30 WIB'} \u2022 {menu?.tanggal || ''}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-semibold">Menu</p>
                    <p className="text-[11px] font-medium leading-tight">{menu?.nama_menu || 'Menu MBG Hari Ini'}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 rounded px-1 py-0.5"><Flame className="h-2.5 w-2.5 text-orange-500" />{menu?.gizi?.kalori || 0} kkal</span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 rounded px-1 py-0.5"><Beef className="h-2.5 w-2.5 text-rose-500" />P {menu?.gizi?.protein_g || 0}g</span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 rounded px-1 py-0.5"><Wheat className="h-2.5 w-2.5 text-amber-500" />K {menu?.gizi?.karbohidrat_g || 0}g</span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 rounded px-1 py-0.5"><Droplets className="h-2.5 w-2.5 text-sky-500" />L {menu?.gizi?.lemak_g || 0}g</span>
                  </div>
                  {(menu?.alergen || []).length > 0 && (
                    <p className="text-[9px] text-amber-700 flex items-start gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" /> Mengandung: {(menu?.alergen || []).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-center shrink-0">
                  <QRCodeSVG value={parentPortalUrl} size={92} level="M" data-testid="label-qr-code" />
                  <p className="text-[8px] text-slate-500 mt-1 w-[92px] leading-tight">Scan untuk lihat gizi & beri ulasan</p>
                </div>
              </div>
              <div className="border-t mt-2 pt-1.5 flex justify-between items-center">
                <p className="text-[8px] text-slate-400">Diproduksi oleh: Dapur SP MBG Katering Sukajadi</p>
                <p className="text-[8px] text-slate-400">Batas konsumsi: {menu?.batas_konsumsi || '12:00 WIB'}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 no-print">
            <Button onClick={printLabel} className="flex-1 bg-primary" data-testid="label-print-confirm-button">
              <Printer className="h-4 w-4 mr-2" /> Cetak Stiker
            </Button>
            <Button variant="outline" onClick={() => setLabelTarget(null)} data-testid="label-close-button">Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
