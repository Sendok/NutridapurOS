import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, Upload, MapPin, Clock, CheckCircle2, XCircle, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'higienis', label: 'Higienitas Dapur & Alat Terjaga' },
  { key: 'suhu', label: 'Suhu Penyajian Sesuai (>60\u00b0C)' },
  { key: 'gizi_4_bintang', label: 'Gizi 4 Bintang Lengkap (Karbo, Hewani, Nabati, Sayur/Buah)' },
  { key: 'uji_rasa', label: 'Uji Rasa Lolos (Taste Test)' },
];

const STATUS_BADGE = {
  approved: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50', label: 'Siap Distribusi (Approved)', icon: CheckCircle2 },
  pending: { cls: 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50', label: 'Menunggu Persetujuan', icon: Clock },
  rejected: { cls: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50', label: 'Perlu Perbaikan', icon: XCircle },
};

export default function QCPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [checklist, setChecklist] = useState({ higienis: false, suhu: false, gizi_4_bintang: false, uji_rasa: false });
  const [catatan, setCatatan] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const canUpload = ['admin', 'gizi'].includes(user?.role);
  const canApprove = ['admin', 'gizi'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/qc/logs');
      setLogs(res.data);
    } catch {
      toast.error('Gagal memuat log QC.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG/PNG).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  };

  const submitQC = async () => {
    if (!photo) {
      toast.error('Unggah foto tray makanan terlebih dahulu.');
      return;
    }
    setUploading(true);
    try {
      await api.post('/qc/upload', { photo, checklist, catatan });
      toast.success('Foto QC berhasil diunggah!', { description: 'Geotag & timestamp tercatat otomatis. Menunggu persetujuan Ahli Gizi.' });
      setPhoto(null);
      setChecklist({ higienis: false, suhu: false, gizi_4_bintang: false, uji_rasa: false });
      setCatatan('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal mengunggah foto QC.');
    } finally {
      setUploading(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.post(`/qc/${id}/approve`);
      toast.success('QC disetujui — Siap Distribusi!', { description: 'Foto otomatis tampil di Portal Orang Tua.' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menyetujui QC.');
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/qc/${id}/reject`);
      toast.warning('QC ditandai Perlu Perbaikan.', { description: 'Tim dapur diminta memperbaiki dan mengunggah ulang.' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menolak QC.');
    }
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Foto & Quality Control</h1>
        <p className="text-sm text-muted-foreground">Dokumentasi tray makanan dengan geotag & timestamp otomatis sebelum distribusi.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Upload panel */}
        {canUpload && (
          <Card className="lg:col-span-2 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Unggah Foto QC Hari Ini
              </CardTitle>
              <CardDescription>Foto tray porsi nyata sebelum pengiriman</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                data-testid="qc-dropzone"
                className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors p-4 text-center ${
                  dragOver ? 'border-primary bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                {photo ? (
                  <img src={photo} alt="Preview QC" className="rounded-lg mx-auto max-h-52 object-cover" data-testid="qc-photo-preview" />
                ) : (
                  <div className="py-8">
                    <Upload className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-sm font-medium mt-2">Klik atau seret foto ke sini</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG/PNG maks. 4 MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} data-testid="qc-file-input" />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" /> Geotag: Dapur SP Sukajadi</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald-600" /> Timestamp otomatis</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Checklist QC</p>
                  <span className="text-xs text-muted-foreground">{checkedCount}/4 terpenuhi</span>
                </div>
                <Progress value={(checkedCount / 4) * 100} className="h-1.5 mb-3" />
                <div className="space-y-2.5">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-start gap-2.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={checklist[item.key]}
                        onCheckedChange={(v) => setChecklist({ ...checklist, [item.key]: !!v })}
                        data-testid={`qc-checklist-${item.key}`}
                        className="mt-0.5"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Catatan QC (opsional): suhu penyajian, kondisi kemasan, dll."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                data-testid="qc-catatan-input"
                rows={2}
              />

              <Button onClick={submitQC} disabled={uploading || !photo} className="w-full bg-primary hover:bg-primary/90" data-testid="qc-submit-button">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Unggah & Ajukan QC
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        <div className={canUpload ? 'lg:col-span-3 space-y-3' : 'lg:col-span-5 space-y-3'}>
          <h2 className="font-display font-semibold">Log Audit QC</h2>
          {logs.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Belum ada log QC.</CardContent></Card>
          )}
          {logs.map((log) => {
            const sb = STATUS_BADGE[log.status] || STATUS_BADGE.pending;
            const SIcon = sb.icon;
            return (
              <Card key={log.id} className="card-hover" data-testid={`qc-log-${log.id}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                  <img src={log.photo} alt="Foto QC" className="rounded-lg w-full sm:w-36 h-28 object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${sb.cls} text-[11px]`}><SIcon className="h-3 w-3 mr-1" /> {sb.label}</Badge>
                      <span className="text-xs text-muted-foreground">{log.tanggal} • {log.waktu}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {log.lokasi}
                    </p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {CHECKLIST_ITEMS.map((c) => (
                        <Badge key={c.key} variant="outline" className={`text-[10px] ${log.checklist?.[c.key] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
                          {log.checklist?.[c.key] ? '\u2713' : '\u2717'} {c.label.split(' ')[0]}
                        </Badge>
                      ))}
                    </div>
                    {log.catatan && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{log.catatan}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-muted-foreground">
                        Oleh: {log.uploaded_by}{log.approved_by ? ` • Ditinjau: ${log.approved_by}` : ''}
                      </p>
                      {canApprove && log.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => reject(log.id)} data-testid={`qc-reject-button-${log.id}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" /> Perlu Perbaikan
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-primary" onClick={() => approve(log.id)} data-testid={`qc-approve-button-${log.id}`}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Setujui
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
