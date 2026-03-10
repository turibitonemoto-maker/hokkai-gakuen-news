"use client";

import { LayoutDashboard, FileText, ImageIcon, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleManager } from "@/components/dashboard/article-manager";
import { HeroManager } from "@/components/dashboard/hero-manager";
import { AdManager } from "@/components/dashboard/ad-manager";

/**
 * 管理用ダッシュボード
 * ログイン機能を一時的にバイパスし、直接管理機能を表示します。
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-2 rounded-lg">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary leading-tight">北海学園大学一部新聞会</h1>
            <p className="text-xs text-slate-500">コンテンツ管理システム（開発モード）</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="articles" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <TabsList className="bg-white border w-full md:w-auto overflow-x-auto justify-start">
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

          <TabsContent value="articles" className="mt-0 outline-none">
            <ArticleManager />
          </TabsContent>
          <TabsContent value="hero" className="mt-0 outline-none">
            <HeroManager />
          </TabsContent>
          <TabsContent value="ads" className="mt-0 outline-none">
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
