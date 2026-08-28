import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TutorialModal } from '@/components/TutorialModal';
import {
  LayoutDashboard, Sparkles, ShoppingCart, Camera, Truck, Wallet, MessageSquareHeart,
  Bell, Menu, LogOut, ChefHat, ExternalLink, BookOpen, CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gizi', 'sekolah'] },
  { to: '/menu-generator', label: 'AI Menu Generator', icon: Sparkles, roles: ['admin', 'gizi'] },
  { to: '/procurement', label: 'Belanja & PO WhatsApp', icon: ShoppingCart, roles: ['admin'] },
  { to: '/qc', label: 'Audit Foto QC', icon: Camera, roles: ['admin', 'gizi', 'sekolah'] },
  { to: '/distribution', label: 'Distribusi & Label', icon: Truck, roles: ['admin', 'sekolah'] },
  { to: '/finance', label: 'Keuangan & SIPGN', icon: Wallet, roles: ['admin'] },
  { to: '/feedback', label: 'Ulasan Orang Tua', icon: MessageSquareHeart, roles: ['admin', 'gizi', 'sekolah'] },
];

const NOTIF_ICONS = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const NOTIF_COLORS = { success: 'text-emerald-600', warning: 'text-amber-600', info: 'text-sky-600' };

const SidebarContent = ({ user, location, onNavigate }) => (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-2 px-4 py-5 border-b">
      <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
        <ChefHat className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-display font-bold text-sm leading-none">NutriDapur OS</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Operasional Dapur MBG</p>
      </div>
    </div>
    <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.filter((i) => i.roles.includes(user.role)).map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-testid={`nav-${item.to.slice(1)}`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
    <div className="border-t px-4 py-3 space-y-2">
      <a
        href="/parent-portal"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="nav-parent-portal-preview"
        className="flex items-center gap-2 text-xs text-emerald-700 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Preview Tampilan Orang Tua
      </a>
      <p className="text-[11px] text-muted-foreground">Dapur SP MBG Katering Sukajadi</p>
    </div>
  </div>
);

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const loadNotifs = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const iv = setInterval(loadNotifs, 30000);
    return () => clearInterval(iv);
  }, [loadNotifs]);

  useEffect(() => {
    // Tampilkan tutorial otomatis saat pertama kali
    if (!localStorage.getItem('nutridapur_tutorial_seen')) {
      setTutorialOpen(true);
      localStorage.setItem('nutridapur_tutorial_seen', '1');
    }
  }, []);

  if (!user) return null;

  const unread = notifs.filter((n) => !n.read).length;

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    loadNotifs();
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    loadNotifs();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r z-30">
        <SidebarContent user={user} location={location} />
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b lg:pl-64">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" data-testid="mobile-menu-button" aria-label="Buka menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent user={user} location={location} onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{user.dapur || 'Dapur SP MBG Katering Sukajadi'}</p>
              <p className="text-xs text-muted-foreground">{user.role_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTutorialOpen(true)}
              data-testid="tutorial-open-button"
              className="hidden sm:inline-flex"
            >
              <BookOpen className="h-4 w-4 mr-1.5" /> Panduan Penggunaan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell-button" aria-label="Notifikasi">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80" data-testid="notification-dropdown">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifikasi</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline" data-testid="notification-mark-all-read">
                      Tandai semua dibaca
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">Belum ada notifikasi.</p>
                )}
                {notifs.slice(0, 8).map((n) => {
                  const Icon = NOTIF_ICONS[n.tipe] || Info;
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className="flex items-start gap-2.5 py-2.5 cursor-pointer"
                      data-testid="notification-item"
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${NOTIF_COLORS[n.tipe] || 'text-sky-600'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm leading-tight ${n.read ? 'text-muted-foreground' : 'font-semibold'}`}>{n.judul}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.pesan}</p>
                      </div>
                      {!n.read && <span className="ml-auto mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" data-testid="user-menu-button">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {user.nama?.charAt(0)}
                  </div>
                  <span className="hidden md:inline text-sm">{user.nama?.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="text-sm">{user.nama}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{user.role_label}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} data-testid="logout-button" className="text-rose-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">{children}</div>
      </main>

      <TutorialModal open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </div>
  );
};
