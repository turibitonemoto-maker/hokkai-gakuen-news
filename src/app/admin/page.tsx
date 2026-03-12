"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  BarChart3, 
  Clock, 
  Loader2, 
  ShieldAlert, 
  Globe, 
  Share2,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from "next/link";

/**
 * 管理者ダッシュボードのメイン（オーバービュー）
 */
export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
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
  
  const maintenanceDocRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "maintenance") : null, [firestore]);

  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);
  const { data: ads, isLoading: isAdsLoading } = useCollection(adsQuery);
  const { data: heroImages } = useCollection(heroQuery);
  const { data: recentArticles, isLoading: isActivityLoading } = useCollection(recentActivityQuery);
  const { data: maintenanceConfig } = useDoc(maintenanceDocRef);

  const stats = {
    articles: articles?.filter(a => a.articleType === "Standard").length || 0,
    noteArticles: articles?.filter(a => a.articleType === "Note").length || 0,
    totalAdClicks: ads?.reduce((sum, ad) => sum + (ad.clickCount || 0), 0) || 0,
    heroImages: heroImages?.length || 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-slate-800">管理者ダッシュボード</h3>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> {currentTime || "読み込み中..."}
          </p>
        </div>
        <div>
          {maintenanceConfig?.isMaintenanceMode && (
            <Badge variant="destructive" className="h-8 px-4 flex gap-2 items-center animate-pulse">
              <ShieldAlert className="h-4 w-4" />
              サイト停止中
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard 
          title="学内記事数" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.articles} 
          delta={`note記事 ${stats.noteArticles}件`} 
          icon={FileText} 
          color="blue"
          href="/admin/articles"
        />
        <QuickStatCard 
          title="広告総閲覧数" 
          value={isAdsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalAdClicks.toLocaleString()} 
          delta="累計クリック" 
          icon={BarChart3} 
          color="green"
          href="/admin/ads"
        />
        <QuickStatCard 
          title="note連動記事" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.noteArticles} 
          delta="外部メディア連携" 
          icon={Share2} 
          color="purple"
          href="/admin/note"
        />
        <QuickStatCard 
          title="システム状態" 
          value={maintenanceConfig?.isMaintenanceMode ? "休止中" : "稼働中"} 
          delta={maintenanceConfig?.isMaintenanceMode ? "メンテモードON" : "正常"} 
          icon={maintenanceConfig?.isMaintenanceMode ? ShieldAlert : Globe} 
          color={maintenanceConfig?.isMaintenanceMode ? "orange" : "blue"}
          href="/admin/maintenance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              最近の更新履歴
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
                        {article.publishDate} • {article.articleType === "Note" ? "note" : "標準"}
                      </span>
                    </div>
                    <Badge variant={article.isPublished ? "default" : "secondary"} className="scale-75 origin-right">
                      {article.isPublished ? "公開" : "下書き"}
                    </Badge>
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
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/articles">
              <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600 mb-2">
                <FileText className="h-4 w-4 text-blue-500" />
                学内記事を投稿
              </Button>
            </Link>
            <Link href="/admin/note">
              <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600 mb-2">
                <Share2 className="h-4 w-4 text-purple-500" />
                noteを同期する
              </Button>
            </Link>
            <Link href="/admin/maintenance">
              <Button variant="outline" className="w-full justify-start gap-3 h-11 text-slate-600 mb-2">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                メンテモード切替
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickStatCard({ title, value, delta, icon: Icon, color, href }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <Link href={href}>
      <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className={cn("p-2 rounded-lg", colorMap[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
            <p className="text-[10px] text-slate-400 mt-1">{delta}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}