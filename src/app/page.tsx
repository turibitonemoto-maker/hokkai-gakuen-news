
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
  BarChart3,
  Clock,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { ArticleManager } from "@/components/dashboard/article-manager";
import { HeroManager } from "@/components/dashboard/hero-manager";
import { AdManager } from "@/components/dashboard/ad-manager";
import { PresidentMessageManager } from "@/components/dashboard/president-message-manager";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { signOut } from "firebase/auth";

type ViewMode = "overview" | "articles" | "hero" | "ads" | "president";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [activeView, setActiveView] = useState<ViewMode>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { id: "overview", label: "ダッシュボード", icon: LayoutDashboard },
    { id: "articles", label: "記事管理", icon: FileText },
    { id: "hero", label: "ヒーロー画像", icon: ImageIcon },
    { id: "ads", label: "広告管理", icon: Megaphone },
    { id: "president", label: "会長挨拶設定", icon: UserRound },
  ];

  const handleLogout = async () => {
    await signOut(auth);
  };

  const renderContent = () => {
    switch (activeView) {
      case "articles":
        return <ArticleManager />;
      case "hero":
        return <HeroManager />;
      case "ads":
        return <AdManager />;
      case "president":
        return <PresidentMessageManager />;
      case "overview":
      default:
        return <DashboardOverview onNavigate={(view) => setActiveView(view)} />;
    }
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
      <div className="min-h-screen flex items-center justify-center bg-[#1e293b] p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside 
        className={cn(
          "bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col fixed inset-y-0 z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="bg-primary text-white p-2 rounded-lg shrink-0">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-sm font-bold text-white leading-tight">北海学園一部新聞会</h1>
              <p className="text-[10px] text-slate-400">CMS 管理パネル</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewMode)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                activeView === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", activeView === item.id ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              {activeView === item.id && isSidebarOpen && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
            </button>
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
              {menuItems.find(i => i.id === activeView)?.label || "ダッシュボード"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-normal">
              ユーザー: {user.email}
            </Badge>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
              {user.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>

        <footer className="py-6 px-8 text-slate-400 text-xs border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p>&copy; {new Date().getFullYear()} 北海学園大学一部新聞会. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="hover:text-primary cursor-pointer">ドキュメント</span>
              <span className="hover:text-primary cursor-pointer">サポート</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function DashboardOverview({ onNavigate }: { onNavigate: (view: ViewMode) => void }) {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    // クライアントサイドでのみ実行することでハイドレーションエラーを防止
    setCurrentTime(new Date().toLocaleString('ja-JP'));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ja-JP'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const articlesQuery = useMemoFirebase(() => firestore ? collection(firestore, "articles") : null, [firestore]);
  const adsQuery = useMemoFirebase(() => firestore ? collection(firestore, "ads") : null, [firestore]);
  const heroQuery = useMemoFirebase(() => firestore ? collection(firestore, "hero-images") : null, [firestore]);
  const recentActivityQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "articles"), orderBy("updatedAt", "desc"), limit(4));
  }, [firestore]);

  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);
  const { data: ads, isLoading: isAdsLoading } = useCollection(adsQuery);
  const { data: heroImages, isLoading: isHeroLoading } = useCollection(heroQuery);
  const { data: recentArticles, isLoading: isActivityLoading } = useCollection(recentActivityQuery);

  const stats = {
    articles: articles?.length || 0,
    publishedArticles: articles?.filter(a => a.isPublished).length || 0,
    totalAdClicks: ads?.reduce((sum, ad) => sum + (ad.clickCount || 0), 0) || 0,
    heroImages: heroImages?.length || 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-slate-800">こんにちは、管理者様</h3>
        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" /> 現在時刻: {currentTime || "読み込み中..."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard 
          title="公開済み記事" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.publishedArticles} 
          delta={`全${stats.articles}件中`} 
          icon={FileText} 
          color="blue"
          onClick={() => onNavigate("articles")}
        />
        <QuickStatCard 
          title="広告総閲覧数" 
          value={isAdsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalAdClicks.toLocaleString()} 
          delta={`${ads?.length || 0}件の広告合計`} 
          icon={BarChart3} 
          color="green"
          onClick={() => onNavigate("ads")}
        />
        <QuickStatCard 
          title="ヒーロー画像数" 
          value={isHeroLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.heroImages} 
          delta="スライド設定中" 
          icon={ImageIcon} 
          color="purple"
          onClick={() => onNavigate("hero")}
        />
        <QuickStatCard 
          title="システム状態" 
          value="良好" 
          delta="正常稼働中" 
          icon={LayoutDashboard} 
          color="orange"
          onClick={() => onNavigate("overview")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden group">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              最近の更新記事
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isActivityLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : recentArticles && recentArticles.length > 0 ? (
                recentArticles.map((article) => (
                  <div key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{article.title}</span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {article.updatedAt?.toDate?.() ? article.updatedAt.toDate().toLocaleString('ja-JP') : "不明"} • タイプ: {article.articleType === "Note" ? "note連携" : "標準記事"}
                      </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100" />
                  </div>
                )
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">更新履歴がありません</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold">クイックアクション</CardTitle>
            <CardDescription>頻繁に使用する操作</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600" onClick={() => onNavigate("articles")}>
              <FileText className="h-4 w-4 text-blue-500" />
              新しい記事を書く
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600" onClick={() => onNavigate("ads")}>
              <Megaphone className="h-4 w-4 text-green-500" />
              広告の状況を確認
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600" onClick={() => onNavigate("hero")}>
              <ImageIcon className="h-4 w-4 text-purple-500" />
              背景画像を差し替える
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickStatCard({ title, value, delta, icon: Icon, color, onClick }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Card 
      className="shadow-sm border-slate-200 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className={cn("p-2 rounded-lg", colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            詳細 <ChevronRight className="h-3 w-3" />
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="text-2xl font-bold text-slate-800 mt-1 flex items-center gap-2">
            {value}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{delta}</p>
        </div>
      </CardContent>
    </Card>
  );
}
