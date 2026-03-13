"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { 
  Share2, 
  Loader2, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2,
  ImageOff,
  RefreshCw,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import Image from "next/image";
import Link from "next/link";

/**
 * NoteManager: 外部メディア（note）の記事を公式サイトへ「選別・採用」するための専用画面。
 * 同期ログ（いつ同期したか）を記録し、DB件数のズレを防ぎます。
 */
export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rssArticles, setRssArticles] = useState<any[]>([]);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const { data: allArticles, isLoading: isDbLoading } = useCollection(noteArticlesQuery);
  
  // 3. 同期ログ用のドキュメント
  const syncLogRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "note-sync");
  }, [firestore, user]);

  const dbNoteIds = useMemo(() => {
    if (!allArticles) return new Set();
    return new Set(allArticles.filter(a => a.articleType === "Note").map(a => a.id));
  }, [allArticles]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      setRssArticles(articles);
      
      // 同期ログを保存
      if (firestore && syncLogRef) {
        setDocumentNonBlocking(syncLogRef, {
          lastSyncAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      toast({ title: "同期完了", description: "最新のnote記事を取得しました。" });
    } catch (e) {
      toast({ variant: "destructive", title: "同期エラー", description: "noteの取得に失敗しました。" });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  const handleImport = (article: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    
    // 取り込み時は常に「下書き(isPublished: false)」として保存
    setDocumentNonBlocking(docRef, {
      ...article,
      isPublished: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    toast({ 
      title: "採用しました", 
      description: `「${article.title}」を記事管理に下書きとして追加しました。` 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">note記事の選別・採用</h2>
          <p className="text-sm text-slate-500">外部メディア（note）から記事を確認し、公式サイトに掲載するものを「下書き」として採用します。</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync} 
            disabled={isSyncing}
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            最新記事をチェック (同期実行)
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-purple-50/50 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
              <Share2 className="h-5 w-5" />
              候補一覧
            </CardTitle>
            <CardDescription>
              note.com から取得した最新の投稿です。
            </CardDescription>
          </div>
          {/* 同期ステータスの表示 */}
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-3 w-3" />
            最終チェック: {isSyncing ? "実行中..." : "完了"}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isSyncing || isDbLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>記事情報</TableHead>
                  <TableHead>note公開日</TableHead>
                  <TableHead className="text-right">DB登録状況</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rssArticles.map((article) => {
                  const isImported = dbNoteIds.has(article.id);
                  return (
                    <TableRow key={article.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex gap-4 items-center py-2">
                          <div className="relative h-14 w-24 rounded-lg overflow-hidden flex-shrink-0 border bg-slate-50 flex items-center justify-center">
                            {article.mainImageUrl ? (
                              <Image 
                                src={article.mainImageUrl} 
                                alt="" 
                                fill 
                                className="object-cover" 
                                sizes="96px"
                                unoptimized
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 opacity-20">
                                <ImageOff className="h-4 w-4" />
                                <span className="text-[8px] font-bold uppercase">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-sm leading-tight">{article.title}</span>
                            <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1 mt-1 font-bold">
                              <ExternalLink className="h-2 w-2" /> noteで原文を読む
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-bold">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-right">
                        {isImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 h-9 px-4 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> 採用済み
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleImport(article)}
                            className="h-9 gap-2 font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 shadow-sm"
                          >
                            <PlusCircle className="h-4 w-4" />
                            サイトに採用する
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rssArticles.length === 0 && !isSyncing && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20 text-slate-400 font-medium italic">
                      記事が取得できませんでした。RSSフィードURLを確認してください。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-slate-100/50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Notice</p>
        <p className="text-sm text-slate-600 font-medium">
          採用済みの記事の「公開・非公開」の切り替えは
          <Link href="/admin/articles" className="text-primary font-bold hover:underline mx-1">
            記事管理画面
          </Link>
          で行ってください。
        </p>
      </div>
    </div>
  );
}
