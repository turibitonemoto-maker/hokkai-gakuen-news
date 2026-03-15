"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  BarChart3, 
  Clock, 
  Loader2, 
  ShieldAlert, 
  ChevronRight,
  Database,
  UserCheck,
  Settings,
  AlertCircle,
  User,
  ShieldCheck,
  Megaphone,
  BookOpen,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from "next/link";

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('ja-JP'));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ja-JP'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const recentActivityQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "articles"), orderBy("updatedAt", "desc"), limit(10));
  }, [firestore, user]);
  
  const maintenanceDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "maintenance");
  }, [firestore, user]);

  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);
  const { data: recentArticles, isLoading: isActivityLoading, error: activityError } = useCollection(recentActivityQuery);
  const { data: maintenanceConfig } = useDoc(maintenanceDocRef);

  const stats = {
    total: articles?.length || 0,
    published: articles?.filter(a => a.isPublished).length || 0,
    viewer: articles?.filter(a => a.categoryId === "Viewer").length || 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">ダッシュボード</h3>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> {currentTime || "読み込み中..."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1 flex gap-2 items-center shadow-sm">
            <UserCheck className="h-3 w-3" />
            管理者: {user?.email}
          </Badge>
          
          {maintenanceConfig?.isMaintenanceMode ? (
            <Badge variant="destructive" className="px-3 py-1 flex gap-2 items-center animate-pulse shadow-md">
              <ShieldAlert className="h-3 w-3" />
              管制: 制限中
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-3 py-1 flex gap-2 items-center shadow-sm">
              <ShieldCheck className="h-3 w-3" />
              管制: 正常
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStatCard 
          title="DB登録記事数" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.total} 
          delta={`公開設定中: ${stats.published}`} 
          icon={Database} 
          color="blue"
          href="/admin/articles"
        />
        <QuickStatCard 
          title="紙面ビューアー" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.viewer} 
          delta="登録アーカイブ数" 
          icon={BookOpen} 
          color="green"
          href="/admin/viewer"
        />
        <QuickStatCard 
          title="システム状態" 
          value={maintenanceConfig?.isMaintenanceMode ? "制限" : "正常"} 
          delta="インフラ稼働ステータス" 
          icon={ShieldCheck} 
          color="purple"
          href="/admin/maintenance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden bg-white rounded-2xl">
          <CardHeader className="bg-white border-b border-slate-50 p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              最新の管制アクティビティ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityError && (
              <div className="p-6 bg-red-50 text-red-800 border-b border-red-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">エラーが発生しました</p>
                    <p className="text-[10px] mt-1 opacity-80 break-all">{activityError.message}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-slate-100">
              {isActivityLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : recentArticles && recentArticles.length > 0 ? (
                recentArticles.map((article) => (
                  <div key={article.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px] group-hover:text-primary transition-colors">{article.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          最終更新: {new Date(article.updatedAt || "").toLocaleString("ja-JP")}
                        </span>
                        {article.updatedBy && (
                          <span className="text-[10px] text-primary flex items-center gap-1 font-bold bg-primary/5 px-1.5 py-0.5 rounded">
                            <User className="h-2 w-2" /> {article.updatedBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={article.isPublished ? "default" : "outline"} className={article.isPublished ? "bg-green-100 text-green-700 border-green-200 text-[10px] font-bold" : "text-slate-400 text-[10px] font-bold"}>
                      {article.isPublished ? "公開中" : "下書き"}
                    </Badge>
                  </div>
                )
              )) : (
                <div className="p-16 text-center text-slate-400 text-sm font-medium italic">記事はまだありません。</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white rounded-2xl">
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-bold">クイック操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <Link href="/admin/articles">
              <Button className="w-full justify-start gap-3 h-12 shadow-sm font-bold text-sm rounded-xl">
                <FileText className="h-5 w-5" />
                <span>記事を新規作成・管理</span>
              </Button>
            </Link>
            <Link href="/admin/viewer">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl">
                <BookOpen className="h-5 w-5" />
                <span>紙面ビューアー管理</span>
              </Button>
            </Link>
            <Link href="/admin/president">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl">
                <User className="h-5 w-5" />
                <span>会長挨拶編集</span>
              </Button>
            </Link>
            <Link href="/admin/about">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl">
                <Info className="h-5 w-5" />
                <span>About Us 編集</span>
              </Button>
            </Link>
            <Link href="/admin/maintenance">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl">
                <Settings className="h-5 w-5" />
                <span>システム設定</span>
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
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <Link href={href}>
      <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all cursor-pointer h-full group bg-white rounded-2xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className={cn("p-2.5 rounded-xl border transition-transform group-hover:scale-110", colorMap[color])}>
              <Icon className="h-6 w-6" />
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
          </div>
          <div className="mt-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <div className="text-4xl font-black text-slate-800 mt-1">{value}</div>
            <p className="text-[11px] text-slate-500 font-bold mt-1.5">{delta}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}