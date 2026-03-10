"use client";

import { useUser, useAuth } from "@/firebase";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, LayoutDashboard, FileText, ImageIcon, Megaphone, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleManager } from "@/components/dashboard/article-manager";
import { HeroManager } from "@/components/dashboard/hero-manager";
import { AdManager } from "@/components/dashboard/ad-manager";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-2 rounded-lg">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary leading-tight">北海学園大学一部新聞会</h1>
            <p className="text-xs text-slate-500">コンテンツ管理システム</p>
          </div>
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
            className="text-slate-600 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="articles" className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <TabsList className="bg-white border">
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                記事管理
              </TabsTrigger>
              <TabsTrigger value="hero" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                ヒーロー画像
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                広告管理
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="articles" className="mt-0">
            <ArticleManager />
          </TabsContent>
          <TabsContent value="hero" className="mt-0">
            <HeroManager />
          </TabsContent>
          <TabsContent value="ads" className="mt-0">
            <AdManager />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} 北海学園大学一部新聞会. All rights reserved.
      </footer>
    </div>
  );
}
