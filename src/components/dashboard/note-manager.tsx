"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  RefreshCw, 
  Loader2, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2, 
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

  // Firestoreにある取り込み済みの記事IDを確認するために取得
  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const { data: allArticles, isLoading: isDbLoading } = useCollection(noteArticlesQuery);

  const dbNoteIds = useMemo(() => {
    if (!allArticles) return new Set();
    return new Set(allArticles.filter(a => a.articleType === "Note").map(a => a.id));
  }, [allArticles]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      setRssArticles(articles);
      toast({ title: "取得完了", description: "noteから最新の記事を読み込みました。" });
    } catch (e) {
      toast({ variant: "destructive", title: "エラー", description: "noteの取得に失敗しました。" });
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
    
    // 下書き状態で保存
    setDocumentNonBlocking(docRef, {
      ...article,
      isPublished: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    toast({ 
      title: "採用しました", 
      description: `「${article.title}」を下書きとして追加しました。「記事管理」から公開してください。` 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">note記事の選別・採用</h2>
          <p className="text-sm text-slate-500">外部メディア（note）の最新記事を確認し、公式サイトに掲載するものを「下書き」として取り込みます。</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/articles">
            <Button variant="outline" className="gap-2 font-bold h-11 border-primary/20 text-primary">
              採用済み記事の公開管理へ
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2 h-11 px-6 shadow-lg font-bold"
          >
            {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            note最新記事をチェック
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-purple-50/50 border-b">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
            <Share2 className="h-5 w-5" />
            note記事の候補
          </CardTitle>
          <CardDescription>
            ここから「サイトに取り込む」を選択した記事だけが、公式サイトの管理対象（下書き）になります。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isSyncing || isDbLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>記事</TableHead>
                  <TableHead>note公開日</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rssArticles.map((article) => {
                  const isImported = dbNoteIds.has(article.id);
                  return (
                    <TableRow key={article.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex gap-4 items-center py-2">
                          {article.mainImageUrl && (
                            <div className="relative h-14 w-24 rounded-lg overflow-hidden flex-shrink-0 border bg-slate-100">
                              <Image 
                                src={article.mainImageUrl} 
                                alt="" 
                                fill 
                                className="object-cover" 
                                sizes="96px"
                              />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-sm">{article.title}</span>
                            <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1 mt-1">
                              <ExternalLink className="h-2 w-2" /> noteで原文を読む
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-right">
                        {isImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 h-9 px-4">
                            <CheckCircle2 className="h-3 w-3" /> 取り込み済み
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleImport(article)}
                            className="h-9 gap-2 font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50"
                          >
                            <PlusCircle className="h-4 w-4" />
                            サイトに下書き保存
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
      
      <div className="bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-300 text-center">
        <p className="text-sm text-slate-500 font-medium">
          ※すでに取り込んだ記事のタイトル変更や公開・非公開の切り替えは、
          <Link href="/admin/articles" className="text-primary font-bold hover:underline mx-1">
            記事管理画面
          </Link>
          で行ってください。
        </p>
      </div>
    </div>
  );
}
