"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  ImageIcon, 
  Megaphone, 
  UserRound, 
  ChevronRight,
  Menu,
  LogOut,
  ShieldAlert,
  Globe,
  ExternalLink,
  Share2,
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

const PUBLIC_SITE_URL = "/";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { id: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "/admin/articles", label: "記事・公開管理", icon: FileText },
    { id: "/admin/note", label: "note管理", icon: Share2 },
    { id: "/admin/hero", label: "ヒーロー画像", icon: ImageIcon },
    { id: "/admin/ads", label: "広告管理", icon: Megaphone, isProtected: true },
    { id: "/admin/president", label: "会長挨拶", icon: UserRound, isProtected: true },
    { id: "/admin/maintenance", label: "メンテナンス管理", icon: ShieldAlert, isProtected: true },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin');
  };

  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
        <header className="py-6 px-8 bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl shadow-md border">
                <Image 
                  src="/favicon.ico" 
                  alt="北海学園新聞会" 
                  width={32} 
                  height={32} 
                  className="rounded-lg"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">北海学園新聞会</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-headline">北海学園大学一部新聞会</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  const activeLabel = menuItems.find(i => i.id === pathname)?.label || "管理";

  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      <aside 
        className={cn(
          "bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg">
            <Image 
              src="/favicon.ico" 
              alt="北海学園新聞会" 
              width={24} 
              height={24} 
              className="rounded-md"
              priority
            />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-sm font-black text-white leading-tight">北海学園新聞会</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">CMS 管理システム</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.id}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                  pathname === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", pathname === item.id ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {isSidebarOpen && (
                  <>
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    {item.isProtected && (
                      <Lock className="h-3 w-3 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </>
                )}
                {pathname === item.id && isSidebarOpen && !item.isProtected && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
              </button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Button 
            variant="ghost" 
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-3 px-3 rounded-xl h-12"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {isSidebarOpen && <span className="text-sm font-bold">ログアウト</span>}
          </Button>
        </div>
      </aside>

      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 rounded-full hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {activeLabel}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold rounded-xl h-9">
                <Globe className="h-4 w-4" />
                サイトを確認
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold border-slate-200 px-3 py-1 rounded-full">
              {user.email}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
