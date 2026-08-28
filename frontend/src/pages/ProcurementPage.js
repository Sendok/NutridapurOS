import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, fmtRp } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Plus, Copy, ShoppingBasket, Loader2, Store, CheckCircle2 } from 'lucide-react';

export default function ProcurementPage() {
  const [data, setData] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [tanggalKirim, setTanggalKirim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [sending, setSending] = useState(false);
  const [vendorDialog, setVendorDialog] = useState(false);
  const [newVendor, setNewVendor] = useState({ nama: '', wa: '', kategori: 'Sayur & Buah' });

  const load = useCallback(async () => {
    try {
      const [slRes, vRes, poRes] = await Promise.all([
        api.get('/procurement/shopping-list'),
        api.get('/procurement/vendors'),
        api.get('/procurement/pos'),
      ]);
      setData(slRes.data);
      setVendors(vRes.data);
      setPos(poRes.data);
      if (vRes.data.length > 0) setSelectedVendor((prev) => prev || vRes.data[0].id);
    } catch {
      toast.error('Gagal memuat data belanja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const vendor = vendors.find((v) => v.id === selectedVendor);
  const vendorItems = (data?.shopping_list || []).filter((i) => !vendor || i.kategori === vendor.kategori);
  const vendorTotal = vendorItems.reduce((s, i) => s + i.subtotal, 0);

  const buildMessage = () => {
    const lines = [
      `*PO BELANJA — ${data?.menu?.nama_menu || 'Menu MBG'}*`,
      `Dapur SP MBG Katering Sukajadi`,
      ``,
      `Kepada: ${vendor?.nama || '-'}`,
      `Tanggal kirim: ${tanggalKirim}`,
      ``,
      `*Daftar Pesanan:*`,
      ...vendorItems.map((i, idx) => `${idx + 1}. ${i.bahan} — ${i.qty} ${i.satuan} (est. ${fmtRp(i.subtotal)})`),
      ``,
      `*Total Estimasi: ${fmtRp(vendorTotal)}*`,
      ``,
      `Mohon konfirmasi ketersediaan & harga. Terima kasih!`,
      `— Dikirim otomatis via NutriDapur OS`,
    ];
    return lines.join('\n');
  };

  const sendPO = async () => {
    if (!vendor) {
      toast.error('Pilih pedagang pasar terlebih dahulu.');
      return;
    }
    if (vendorItems.length === 0) {
      toast.error('Tidak ada item belanja untuk kategori pedagang ini.');
      return;
    }
    setSending(true);
    try {
      await api.post('/procurement/po', {
        vendor_id: vendor.id,
        items: vendorItems.map((i) => ({ nama: i.bahan, qty: `${i.qty} ${i.satuan}`, harga: i.subtotal })),
        tanggal_kirim: tanggalKirim,
        total: vendorTotal,
      });
      const url = `https://wa.me/${vendor.wa}?text=${encodeURIComponent(buildMessage())}`;
      window.open(url, '_blank', 'noopener');
      toast.success('PO WhatsApp terkirim & tercatat!', { description: `Ke ${vendor.nama} • ${fmtRp(vendorTotal)}` });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal membuat PO.');
    } finally {
      setSending(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildMessage());
      toast.success('Pesan PO disalin ke clipboard!');
    } catch {
      toast.error('Gagal menyalin pesan.');
    }
  };

  const addVendor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/procurement/vendors', newVendor);
      toast.success(`Pedagang "${res.data.nama}" ditambahkan!`);
      setVendorDialog(false);
      setNewVendor({ nama: '', wa: '', kategori: 'Sayur & Buah' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menambah pedagang.');
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Belanja Pasar & PO WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Daftar belanja pasar tradisional otomatis dari menu terkunci: <strong>{data?.menu?.nama_menu || 'Belum ada menu terkunci'}</strong></p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Shopping list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <ShoppingBasket className="h-4 w-4 text-primary" /> Daftar Belanja Pasar Tradisional
            </CardTitle>
            <CardDescription>Kuantitas dihitung otomatis untuk {data?.menu?.porsi_target?.toLocaleString('id-ID') || 0} porsi</CardDescription>
          </CardHeader>
          <CardContent>
            {(data?.shopping_list || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada menu terkunci. Kunci menu di AI Menu Generator terlebih dahulu.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="shopping-list-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bahan</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Estimasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.shopping_list.map((item, i) => (
                      <TableRow key={i} data-testid={`shopping-item-${i}`}>
                        <TableCell className="font-medium text-sm">{item.bahan}</TableCell>
                        <TableCell className="text-sm tabular-nums">{item.qty} {item.satuan}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[11px]">{item.kategori}</Badge></TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtRp(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={3}>Total Estimasi Belanja</TableCell>
                      <TableCell className="text-right tabular-nums" data-testid="shopping-total">{fmtRp(data.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PO Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" /> Kirim PO via WhatsApp
              </CardTitle>
              <CardDescription>PO terformat otomatis untuk pedagang pasar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Pedagang Pasar</Label>
                  <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-700" data-testid="add-vendor-button">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="add-vendor-dialog">
                      <DialogHeader>
                        <DialogTitle className="font-display">Tambah Pedagang Pasar</DialogTitle>
                        <DialogDescription>Simpan kontak pedagang langganan Anda</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addVendor} className="space-y-3">
                        <div>
                          <Label>Nama Pedagang Pasar</Label>
                          <Input required placeholder="cth: Bu Siti (Lapak Sayur)" value={newVendor.nama}
                            onChange={(e) => setNewVendor({ ...newVendor, nama: e.target.value })} data-testid="vendor-nama-input" className="mt-1" />
                        </div>
                        <div>
                          <Label>No. WhatsApp (format 62xxx)</Label>
                          <Input required placeholder="6281234567890" pattern="[0-9]{9,15}" value={newVendor.wa}
                            onChange={(e) => setNewVendor({ ...newVendor, wa: e.target.value.replace(/\D/g, '') })} data-testid="vendor-wa-input" className="mt-1" />
                        </div>
                        <div>
                          <Label>Kategori</Label>
                          <Select value={newVendor.kategori} onValueChange={(v) => setNewVendor({ ...newVendor, kategori: v })}>
                            <SelectTrigger className="mt-1" data-testid="vendor-kategori-select"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sayur & Buah">Sayur & Buah</SelectItem>
                              <SelectItem value="Ayam & Daging">Ayam & Daging</SelectItem>
                              <SelectItem value="Ikan & Seafood">Ikan & Seafood</SelectItem>
                              <SelectItem value="Sembako & Beras">Sembako & Beras</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full bg-primary" data-testid="vendor-save-button">Simpan Pedagang</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="mt-1" data-testid="po-vendor-select"><SelectValue placeholder="Pilih pedagang" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nama} • {v.kategori}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vendor && (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Store className="h-3 w-3" /> {vendor.pasar} • WA: {vendor.wa}
                  </p>
                )}
              </div>
              <div>
                <Label>Tanggal Pengiriman</Label>
                <Input type="date" value={tanggalKirim} onChange={(e) => setTanggalKirim(e.target.value)} data-testid="po-date-input" className="mt-1" />
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">Item untuk kategori {vendor?.kategori || '-'}</p>
                {vendorItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Tidak ada item pada kategori ini.</p>
                ) : (
                  <>
                    <ul className="mt-1.5 space-y-1">
                      {vendorItems.map((i, idx) => (
                        <li key={idx} className="text-xs flex justify-between">
                          <span>{i.bahan} ({i.qty} {i.satuan})</span>
                          <span className="tabular-nums">{fmtRp(i.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-bold mt-2 flex justify-between"><span>Total</span><span className="tabular-nums">{fmtRp(vendorTotal)}</span></p>
                  </>
                )}
              </div>
              <Button onClick={sendPO} disabled={sending || vendorItems.length === 0} className="w-full bg-[#25D366] hover:bg-[#1fb355] text-white" data-testid="procurement-whatsapp-send-button">
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                Kirim PO via WhatsApp
              </Button>
              <Button variant="outline" onClick={copyMessage} disabled={vendorItems.length === 0} className="w-full" data-testid="procurement-copy-button">
                <Copy className="h-4 w-4 mr-2" /> Salin Pesan PO
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PO history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Riwayat PO Terkirim</CardTitle>
        </CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada PO terkirim.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="po-history-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pedagang</TableHead>
                    <TableHead>Kirim</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="text-sm">{po.tanggal}</TableCell>
                      <TableCell className="text-sm font-medium">{po.vendor_nama}</TableCell>
                      <TableCell className="text-sm">{po.tanggal_kirim}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmtRp(po.total)}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Terkirim
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
