
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { 
  Share2, 
  Loader2, 
  ExternalLink, 
  PlusCircle, 
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
          <h2 className="text-2xl font-bold text-slate-800">note管理</h2>
          <p className="text-sm text-slate-500">外部メディア（note）から記事を公式サイトへ取り込みます。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          最新記事をチェック
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-purple-50/50 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
              <Share2 className="h-5 w-5" />
              note 投稿一覧
            </CardTitle>
            <CardDescription>
              note.com の公式アカウントから取得した最新の投稿です。
            </CardDescription>
          </div>
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-3 w-3" />
            最終チェック: {isSyncing ? "同期中..." : "完了"}
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
                  <TableHead>公開日</TableHead>
                  <TableHead className="text-right">状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rssArticles.map((article) => {
                  const isImported = dbNoteIds.has(article.id);
                  return (
                    <TableRow key={article.id} className="group hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex gap-4 items-center py-2">
                          <div className="relative h-12 w-20 rounded-lg overflow-hidden border bg-slate-50 flex-shrink-0">
                            {article.mainImageUrl ? (
                              <Image src={article.mainImageUrl} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <ImageOff className="h-4 w-4 m-auto opacity-20" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-sm">{article.title}</span>
                            <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1 mt-1 font-bold">
                              <ExternalLink className="h-2 w-2" /> noteで開く
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-bold">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-right">
                        {isImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-8 px-3 font-bold">採用済み</Badge>
                        ) : (
                          <Button size="sm" onClick={() => handleImport(article)} className="h-8 gap-2 font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 shadow-sm">
                            <PlusCircle className="h-4 w-4" />
                            採用
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-slate-100/50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-sm text-slate-600 font-medium">
          採用した記事の公開・非公開の管理は 
          <Link href="/admin/articles" className="text-primary font-bold hover:underline mx-1">記事管理</Link> 
          で行います。
        </p>
      </div>
    </div>
  );
}
