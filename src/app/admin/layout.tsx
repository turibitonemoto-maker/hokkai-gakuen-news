
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
  Lock,
  BookOpen,
  Info,
  Share2
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

  const menuItems = [
    { id: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "/admin/articles", label: "記事・公開管理", icon: FileText },
    { id: "/admin/viewer", label: "紙面ビューアー", icon: BookOpen },
    { id: "/admin/note", label: "note管理", icon: Share2 },
    { id: "/admin/ads", label: "広告管理", icon: Megaphone, isProtected: true },
    { id: "/admin/president", label: "会長挨拶", icon: UserRound, isProtected: true },
    { id: "/admin/about", label: "About Us", icon: Info, isProtected: true },
    { id: "/admin/maintenance", label: "システム制御", icon: ShieldAlert, isProtected: true },
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
                  src="/icon.png" 
                  alt="北海学園新聞会" 
                  width={32} 
                  height={32} 
                  className="rounded-lg"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">北海学園新聞会</h1>
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

  // 記事作成・編集時はサイドバーなしのフルスクリーン
  const isEditorPage = pathname === '/admin/new' || pathname.startsWith('/admin/edit/');
  if (isEditorPage) {
    return <div className="min-h-screen bg-white font-body">{children}</div>;
  }

  const activeLabel = menuItems.find(i => i.id === pathname)?.label || "管理";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1e293b] text-slate-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
        <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg">
          <Image 
            src="/icon.png" 
            alt="北海学園新聞会" 
            width={24} 
            height={24} 
            className="rounded-md"
            priority
          />
        </div>
        {(isSidebarOpen || isMobile) && (
          <div className="overflow-hidden whitespace-nowrap text-left">
            <h1 className="text-sm font-black text-white leading-tight">北海学園新聞会</h1>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 mt-4 overflow-y-auto">
        {menuItems.map((item) => (
          <Link key={item.id} href={item.id} onClick={() => setIsMobileMenuOpen(false)}>
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
                <>
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                  {item.isProtected && (
                    <Lock className="h-3 w-3 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                  )}
                </>
              )}
              {pathname === item.id && (isSidebarOpen || isMobile) && !item.isProtected && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
            </button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50 flex flex-col gap-2">
        <Button 
          variant="ghost" 
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start gap-3 px-3 rounded-xl h-12"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {(isSidebarOpen || isMobile) && <span className="text-sm font-bold">ログアウト</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-body overflow-x-hidden">
      {!isMobile && (
        <aside 
          className={cn(
            "bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
            isSidebarOpen ? "w-64" : "w-20"
          )}
        >
          <SidebarContent />
        </aside>
      )}

      {isMobile && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <div className="hidden" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#1e293b] border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>ナビゲーションメニュー</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      )}

      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 min-w-0",
          !isMobile ? (isSidebarOpen ? "ml-64" : "ml-20") : "ml-0"
        )}
      >
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => isMobile ? setIsMobileMenuOpen(true) : setIsSidebarOpen(!isSidebarOpen)} 
              className="text-slate-500 rounded-full hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 md:gap-3 truncate">
              <Image 
                src="/icon.png" 
                alt="" 
                width={24} 
                height={24} 
                className="rounded shadow-sm shrink-0"
              />
              <span className="truncate">{activeLabel}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Badge variant="outline" className="flex bg-slate-50 text-slate-500 font-bold border-slate-200 px-3 py-1 rounded-full">
              {user.email}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
