
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
  Inbox,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import Link from "next/link";

/**
 * 管理者ダッシュボード（管制塔）
 * 重要なステータスを即座に把握し、アクションへ繋げます。
 */
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

  // 1. データベース件数
  const articlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  // 2. お問い合わせ（未読数）
  const inquiriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "inquiries");
  }, [firestore, user]);

  // 3. note同期ログ
  const syncLogDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "note-sync");
  }, [firestore, user]);

  // 4. 最新のアクティビティ
  const recentActivityQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "articles"), orderBy("updatedAt", "desc"), limit(6));
  }, [firestore, user]);
  
  // 5. メンテナンスモード状態
  const maintenanceDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "maintenance");
  }, [firestore, user]);

  const { data: articles, isLoading: isArticlesLoading, error: articlesError } = useCollection(articlesQuery);
  const { data: inquiries } = useCollection(inquiriesQuery);
  const { data: recentArticles, isLoading: isActivityLoading } = useCollection(recentActivityQuery);
  const { data: syncLog } = useDoc(syncLogDocRef);
  const { data: maintenanceConfig } = useDoc(maintenanceDocRef);

  const stats = {
    total: articles?.length || 0,
    internal: articles?.filter(a => a.articleType === "Standard").length || 0,
    note: articles?.filter(a => a.articleType === "Note").length || 0,
    published: articles?.filter(a => a.isPublished).length || 0,
    unreadInquiries: inquiries?.filter(i => !i.isRead).length || 0,
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
          <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1 flex gap-2 items-center">
            <UserCheck className="h-3 w-3" />
            ログイン: {user?.email} (管理者)
          </Badge>
          
          {maintenanceConfig?.isMaintenanceMode ? (
            <Badge variant="destructive" className="px-3 py-1 flex gap-2 items-center animate-pulse">
              <ShieldAlert className="h-3 w-3" />
              公開サイト: メンテナンス中
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-3 py-1 flex gap-2 items-center">
              <Globe className="h-3 w-3" />
              公開サイト: 稼働中
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard 
          title="全登録記事" 
          value={isArticlesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.total} 
          delta={`公開: ${stats.published} / 下書き: ${stats.total - stats.published}`} 
          icon={Database} 
          color="blue"
          href="/admin/articles"
        />
        <QuickStatCard 
          title="未読メッセージ" 
          value={stats.unreadInquiries} 
          delta="お問い合わせ対応待ち" 
          icon={Inbox} 
          color="orange"
          href="/admin/inquiries"
        />
        <QuickStatCard 
          title="note採用記事" 
          value={stats.note} 
          delta="外部メディア連動" 
          icon={Share2} 
          color="purple"
          href="/admin/note"
        />
        <QuickStatCard 
          title="最終同期" 
          value={syncLog?.lastSyncAt ? new Date(syncLog.lastSyncAt).toLocaleTimeString("ja-JP") : "--:--"} 
          delta={syncLog?.lastSyncAt ? new Date(syncLog.lastSyncAt).toLocaleDateString("ja-JP") : "同期履歴なし"} 
          icon={Clock} 
          color="green"
          href="/admin/note"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              最新のDB更新・公開ステータス
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {articlesError && (
              <div className="p-6 bg-red-50 text-red-800 border-b border-red-100">
                <p className="font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  インデックスエラーの可能性があります
                </p>
                <p className="text-xs mt-2 leading-relaxed italic">
                  並べ替えを行うにはインデックス作成が必要です。デベロッパーコンソールに表示されるFirebaseのURLをクリックして、インデックスを有効化してください。
                </p>
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {isActivityLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : recentArticles && recentArticles.length > 0 ? (
                recentArticles.map((article) => (
                  <div key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {article.articleType === "Note" ? (
                          <Badge className="bg-purple-600 text-white border-none text-[8px] h-4 px-1">note</Badge>
                        ) : (
                          <Badge className="bg-primary text-white border-none text-[8px] h-4 px-1">学内</Badge>
                        )}
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px] md:max-w-xs">{article.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 ml-10">
                        最終更新: {new Date(article.updatedAt || "").toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={article.isPublished ? "default" : "outline"} className={cn(
                        "scale-75 origin-right font-bold whitespace-nowrap",
                        article.isPublished ? "bg-green-100 text-green-700 border-green-200" : "text-slate-400"
                      )}>
                        {article.isPublished ? "公開中" : "非公開"}
                      </Badge>
                    </div>
                  </div>
                )
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  記事が1件もありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold">クイック制御</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/articles">
              <Button className="w-full justify-start gap-3 h-12 shadow-sm font-bold">
                <FileText className="h-5 w-5" />
                学内記事を作成
              </Button>
            </Link>
            <Link href="/admin/inquiries">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold">
                <Inbox className="h-5 w-5" />
                お問い合わせを確認
              </Button>
            </Link>
            <Link href="/admin/maintenance">
              <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
                <Settings className="h-5 w-5" />
                サイト制御・メンテナンス
              </Button>
            </Link>
            <Separator className="my-2" />
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">表示サイト連動</p>
              <a href="https://hokkai-newspaper-frontend.vercel.app/" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="w-full justify-center gap-2 font-bold h-10">
                  <Globe className="h-4 w-4" />
                  公開ページを開く
                </Button>
              </a>
            </div>
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
      <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all cursor-pointer h-full group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", colorMap[color])}>
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
