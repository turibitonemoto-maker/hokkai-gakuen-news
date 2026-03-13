
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
  Newspaper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

const PUBLIC_SITE_URL = "https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/";

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
    { id: "/admin/ads", label: "広告管理", icon: Megaphone },
    { id: "/admin/president", label: "会長挨拶設定", icon: UserRound },
    { id: "/admin/maintenance", label: "メンテナンス管理", icon: ShieldAlert },
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
              <div className="bg-primary p-2 rounded-xl text-white shadow-lg">
                <Newspaper className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Hokkai Gakuen News 1</h1>
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
    <div className="min-h-screen bg-slate-50 flex">
      <aside 
        className={cn(
          "bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="bg-primary text-white p-2 rounded-lg shrink-0 shadow-lg">
            <Newspaper className="h-5 w-5" />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-sm font-bold text-white leading-tight">北海学園一部新聞会</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">CMS Control</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.id}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group mb-1",
                  pathname === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", pathname === item.id ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                {pathname === item.id && isSidebarOpen && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
              </button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Button 
            variant="ghost" 
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-3 px-3"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">ログアウト</span>}
          </Button>
        </div>
      </aside>

      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500">
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold text-slate-800">
              {activeLabel}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                <Globe className="h-4 w-4" />
                表示サイトを確認
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-normal border-slate-200">
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
