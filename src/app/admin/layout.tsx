
"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Megaphone, 
  UserRound, 
  ChevronRight,
  Menu,
  LogOut,
  ShieldAlert,
  Loader2,
  BookOpen,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const MENU_ITEMS = [
  { id: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { id: "/admin/articles", label: "記事・公開管理", icon: FileText },
  { id: "/admin/viewer", label: "紙面アーカイブ", icon: BookOpen },
  { id: "/admin/ads", label: "広告管理", icon: Megaphone },
  { id: "/admin/president", label: "会長挨拶", icon: UserRound },
  { id: "/admin/about", label: "About Us", icon: Info },
  { id: "/admin/maintenance", label: "システム設定", icon: ShieldAlert },
];

function SidebarContent({ 
  pathname, 
  isSidebarOpen, 
  isMobile, 
  onLogout, 
  onCloseMobile 
}: { 
  pathname: string; 
  isSidebarOpen: boolean; 
  isMobile: boolean; 
  onLogout: () => void;
  onCloseMobile?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#1e293b] text-slate-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
        <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg">
          <Image 
            src="/icon.png" 
            alt="北海学園大学新聞" 
            width={24} 
            height={24} 
            className="rounded-md"
            priority
          />
        </div>
        {(isSidebarOpen || isMobile) && (
          <div className="overflow-hidden whitespace-nowrap text-left">
            <h1 className="text-sm font-black text-white leading-tight">北海学園大学新聞</h1>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 mt-4 overflow-y-auto">
        {MENU_ITEMS.map((item) => (
          <Link key={item.id} href={item.id} onClick={onCloseMobile}>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                pathname === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", pathname === item.id ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {(isSidebarOpen || isMobile) && (
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
              )}
              {pathname === item.id && (isSidebarOpen || isMobile) && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
            </button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50 flex flex-col gap-2">
        <Button 
          variant="ghost" 
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-3 px-3 rounded-xl h-12"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          {(isSidebarOpen || isMobile) && <span className="text-sm font-bold">ログアウト</span>}
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F0F2F5]">
        <div className="w-full max-w-md"><LoginForm /></div>
      </div>
    );
  }

  const isEditorPage = pathname === '/admin/new' || pathname.startsWith('/admin/edit/');
  if (isEditorPage) return <div className="min-h-screen bg-white font-body">{children}</div>;

  const activeLabel = MENU_ITEMS.find(i => i.id === pathname)?.label || "管理";

  return (
    <div className="min-h-screen bg-slate-50 flex font-body overflow-x-hidden">
      {!isMobile && (
        <aside className={cn("bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50", isSidebarOpen ? "w-64" : "w-20")}>
          <SidebarContent pathname={pathname} isSidebarOpen={isSidebarOpen} onLogout={handleLogout} isMobile={false} />
        </aside>
      )}

      {isMobile && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-[#1e293b] border-none">
            <SheetHeader className="sr-only"><SheetTitle>ナビゲーションメニュー</SheetTitle></SheetHeader>
            <SidebarContent pathname={pathname} isSidebarOpen={true} isMobile={true} onLogout={handleLogout} onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className={cn("flex-1 flex flex-col transition-all duration-300 min-w-0", !isMobile ? (isSidebarOpen ? "ml-64" : "ml-20") : "ml-0")}>
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => isMobile ? setIsMobileMenuOpen(true) : setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 rounded-full hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 md:gap-3 truncate">
              <Image src="/icon.png" alt="" width={24} height={24} className="rounded shadow-sm shrink-0" />
              <span className="truncate">{activeLabel}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
             <span className="hidden sm:inline-block text-xs font-bold text-slate-400">{user.email}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
