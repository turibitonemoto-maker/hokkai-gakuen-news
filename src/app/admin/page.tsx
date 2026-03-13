
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
  ChevronRight,
  Database,
  UserCheck,
  Settings,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from "next/link";

const PUBLIC_SITE_URL = "https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/";

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

  const syncLogDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "note-sync");
  }, [firestore, user]);

  const recentActivityQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "articles"), orderBy("updatedAt", "desc"), limit(6));
  }, [firestore, user]);
  
  const maintenanceDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "maintenance");
  }, [firestore, user]);

  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);
  const { data: recentArticles, isLoading: isActivityLoading, error: activityError } = useCollection(recentActivityQuery);
  const { data: syncLog } = useDoc(syncLogDocRef);
  const { data: maintenanceConfig } = useDoc(maintenanceDocRef);

  const stats = {
    total: articles?.length || 0,
    note: articles?.filter(a => a.articleType === "Note").length || 0,
    published: articles?.filter(a => a.isPublished).length || 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-slate-800">管制塔ダッシュボード</h3>
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
              表示サイト: メンテナンス中
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-3 py-1 flex gap-2 items-center shadow-sm">
              <Globe className="h-3 w-3" />
              表示サイト: 公開中
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStatCard 
          title="DB登録記事数" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.total} 
          delta={`公開中: ${stats.published}`} 
          icon={Database} 
          color="blue"
          href="/admin/articles"
        />
        <QuickStatCard 
          title="note連携記事" 
          value={stats.note} 
          delta="外部メディア管理数" 
          icon={Share2} 
          color="purple"
          href="/admin/note"
        />
        <QuickStatCard 
          title="最終note同期" 
          value={syncLog?.lastSyncAt ? new Date(syncLog.lastSyncAt).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' }) : "--:--"} 
          delta={syncLog?.lastSyncAt ? new Date(syncLog.lastSyncAt).toLocaleDateString("ja-JP") : "履歴なし"} 
          icon={Clock} 
          color="green"
          href="/admin/note"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              最新のアクティビティ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityError && (
              <div className="p-6 bg-red-50 text-red-800 border-b border-red-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">インデックスの作成が必要です</p>
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
                  <div key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Badge className={article.articleType === "Note" ? "bg-purple-600 h-4 px-1 text-[8px]" : "bg-primary h-4 px-1 text-[8px]"}>
                          {article.articleType === "Note" ? "note" : "学内"}
                        </Badge>
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{article.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">
                        更新: {new Date(article.updatedAt || "").toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <Badge variant={article.isPublished ? "default" : "outline"} className={article.isPublished ? "bg-green-100 text-green-700 border-green-200 text-[10px]" : "text-slate-400 text-[10px]"}>
                      {article.isPublished ? "公開中" : "下書き"}
                    </Badge>
                  </div>
                )
              )) : (
                <div className="p-12 text-center text-slate-400 text-sm italic">記事がありません。</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold">クイック操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/articles">
              <Button className="w-full justify-start gap-3 h-12 shadow-sm font-bold text-sm">
                <FileText className="h-5 w-5" />
                <span>記事の新規作成</span>
              </Button>
            </Link>
            <Link href="/admin/note">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-sm">
                <Share2 className="h-5 w-5" />
                <span>note管理</span>
              </Button>
            </Link>
            <Link href="/admin/maintenance">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm">
                <Settings className="h-5 w-5" />
                <span>システム設定</span>
              </Button>
            </Link>
            <Separator className="my-2" />
            <a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full justify-center gap-2 font-bold h-10 shadow-sm">
                <Globe className="h-4 w-4" />
                <span>表示サイトを開く</span>
              </Button>
            </a>
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
      <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all cursor-pointer h-full group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className={cn("p-2 rounded-xl border transition-transform group-hover:scale-110", colorMap[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
            <div className="text-3xl font-black text-slate-800 mt-1">{value}</div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{delta}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
