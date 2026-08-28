import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Stethoscope, School, Loader2, HeartHandshake, ShieldCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Demo: Admin Dapur / Vendor', email: 'admin@nutridapur.id', icon: ChefHat, testid: 'login-demo-admin-button', color: 'bg-primary hover:bg-primary/90 text-white' },
  { label: 'Demo: Ahli Gizi', email: 'gizi@nutridapur.id', icon: Stethoscope, testid: 'login-demo-gizi-button', color: 'bg-emerald-600 hover:bg-emerald-600/90 text-white' },
  { label: 'Demo: Pihak Sekolah', email: 'sekolah@nutridapur.id', icon: School, testid: 'login-demo-sekolah-button', color: 'bg-amber-500 hover:bg-amber-500/90 text-white' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ nama: '', email: '', password: '', role: 'admin' });

  const doLogin = async (email, password) => {
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Selamat datang, ${user.nama}!`, { description: user.role_label });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal masuk. Periksa email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    doLogin(loginForm.email, loginForm.password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(regForm.nama, regForm.email, regForm.password, regForm.role);
      toast.success(`Akun berhasil dibuat. Selamat datang, ${user.nama}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold">NutriDapur OS</span>
          </Link>

          <h1 className="font-display text-2xl font-bold">Masuk ke Dapur Anda</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola operasional MBG harian dengan mudah.</p>

          {/* Quick Demo */}
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Demo Login (1 Klik)</p>
            {DEMO_ACCOUNTS.map((d) => {
              const Icon = d.icon;
              return (
                <Button
                  key={d.email}
                  className={`w-full justify-start ${d.color}`}
                  disabled={loading}
                  onClick={() => doLogin(d.email, 'demo123')}
                  data-testid={d.testid}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Icon className="h-4 w-4 mr-2" />}
                  {d.label}
                </Button>
              );
            })}
            <Link to="/parent-portal">
              <Button variant="outline" className="w-full justify-start mt-1" data-testid="login-parent-portal-button">
                <HeartHandshake className="h-4 w-4 mr-2 text-amber-600" />
                Orang Tua Murid — Buka Portal Tanpa Login
              </Button>
            </Link>
          </div>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">atau dengan akun</span>
            <Separator className="flex-1" />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login" data-testid="login-tab">Masuk</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Daftar Baru</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" required placeholder="nama@dapur.id" value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} data-testid="login-email-input" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" required placeholder="••••••••" value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} data-testid="login-password-input" className="mt-1" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading} data-testid="login-submit-button">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Masuk
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="reg-nama">Nama Lengkap</Label>
                  <Input id="reg-nama" required placeholder="Nama Anda" value={regForm.nama}
                    onChange={(e) => setRegForm({ ...regForm, nama: e.target.value })} data-testid="register-nama-input" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" required placeholder="nama@dapur.id" value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} data-testid="register-email-input" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" required minLength={6} placeholder="Minimal 6 karakter" value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} data-testid="register-password-input" className="mt-1" />
                </div>
                <div>
                  <Label>Peran</Label>
                  <Select value={regForm.role} onValueChange={(v) => setRegForm({ ...regForm, role: v })}>
                    <SelectTrigger className="mt-1" data-testid="register-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin Dapur / Vendor</SelectItem>
                      <SelectItem value="gizi">Ahli Gizi / Auditor</SelectItem>
                      <SelectItem value="sekolah">Pihak Sekolah / Guru</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading} data-testid="register-submit-button">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Daftar & Masuk
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right visual */}
      <div className="hidden lg:flex hero-gradient noise-overlay items-center justify-center p-10">
        <div className="max-w-md">
          <Badge variant="outline" className="bg-white/80 text-emerald-700 border-emerald-200 mb-4">
            <ShieldCheck className="h-3 w-3 mr-1" /> Ekosistem Pelengkap SIPGN
          </Badge>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Satu Sistem untuk Seluruh Operasional Dapur MBG Anda
          </h2>
          <div className="mt-6 space-y-4">
            {[
              'AI menyusun menu bergizi sesuai budget Rp 15.000/porsi',
              'PO belanja pasar terkirim otomatis via WhatsApp',
              'Foto QC terverifikasi Ahli Gizi sebelum distribusi',
              'Orang tua melihat transparansi gizi via QR code',
              'Laporan harian siap unggah ke SIPGN/BGN',
            ].map((t, i) => (
              <Card key={i} className="card-hover">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <p className="text-sm">{t}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
