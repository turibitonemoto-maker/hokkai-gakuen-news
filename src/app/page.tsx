"use client";

import { useUser, useAuth } from "@/firebase";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, CheckCircle2, LayoutDashboard, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full animate-in fade-in zoom-in-95 duration-500">
          <LoginForm />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-2 rounded-lg">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-headline font-bold text-primary">SecureEntry</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <UserIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{user.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-headline font-bold text-slate-900">認証に成功しました</h2>
              <p className="text-slate-500 mt-1">セキュアエリアへようこそ。あなたのアクセスは承認されています。</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 group hover:border-primary hover:text-primary transition-all duration-300">
                <div className="bg-slate-50 group-hover:bg-primary/10 p-4 rounded-full mb-4 transition-colors">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <span className="font-semibold">コンテンツ {i}</span>
                <span className="text-xs text-slate-400 mt-2">準備中...</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} SecureEntry Systems. 全著作権所有。
      </footer>
    </div>
  );
}
