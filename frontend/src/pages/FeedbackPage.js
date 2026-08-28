import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquareHeart } from 'lucide-react';

const Stars = ({ value }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
    ))}
  </span>
);

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/feedback')
      .then((res) => setFeedbacks(res.data))
      .catch(() => toast.error('Gagal memuat ulasan.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  const avg = feedbacks.length ? (feedbacks.reduce((s, f) => s + (f.rating_avg || 0), 0) / feedbacks.length).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Ulasan Orang Tua Murid</h1>
          <p className="text-sm text-muted-foreground">Feedback langsung dari Portal NutriTransparan.</p>
        </div>
        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 px-3 py-1.5" data-testid="feedback-avg-badge">
          <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" /> Rata-rata {avg} \u2605 dari {feedbacks.length} ulasan
        </Badge>
      </div>

      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareHeart className="h-8 w-8 mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada ulasan masuk dari orang tua.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {feedbacks.map((f) => (
            <Card key={f.id} className="card-hover" data-testid={`feedback-card-${f.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{f.sekolah}</p>
                    <p className="text-xs text-muted-foreground">{f.kelas} \u2022 {f.tanggal}</p>
                  </div>
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50">{f.rating_avg} \u2605</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-muted-foreground">Rasa</p>
                    <Stars value={f.rasa} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-muted-foreground">Porsi</p>
                    <Stars value={f.porsi} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-muted-foreground">Kesegaran</p>
                    <Stars value={f.kesegaran} />
                  </div>
                </div>
                {(f.tags || []).length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {f.tags.map((t, i) => (
                      <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">{t}</Badge>
                    ))}
                  </div>
                )}
                {f.catatan && <p className="text-sm text-slate-600 mt-2 italic">"{f.catatan}"</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
