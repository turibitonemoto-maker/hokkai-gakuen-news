
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { 
  Share2, 
  Loader2, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import Image from "next/image";
import Link from "next/link";

/**
 * NoteManager: 外部メディア（note）の記事を公式サイトへ「選別・採用」するための専用画面。
 */
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

  // 初期表示時に自動で最新記事をチェック
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      setRssArticles(articles);
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">note記事の選別・採用</h2>
        <p className="text-sm text-slate-500">外部メディア（note）の最新記事を確認し、公式サイトに掲載するものを「下書き」として取り込みます。</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-purple-50/50 border-b">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
            <Share2 className="h-5 w-5" />
            note記事の取り込み候補
          </CardTitle>
          <CardDescription>
            ここから「採用」を選択した記事だけが、公式サイトの管理対象（下書き）になります。
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
                            <CheckCircle2 className="h-3 w-3" /> 採用済み
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleImport(article)}
                            className="h-9 gap-2 font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50"
                          >
                            <PlusCircle className="h-4 w-4" />
                            サイトに採用する
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
      
      <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-sm text-slate-500 font-medium">
          ※採用済みの記事の公開・非公開の切り替えや、タイトル・本文の編集は
          <Link href="/admin/articles" className="text-primary font-bold hover:underline mx-1">
            記事管理画面
          </Link>
          で行ってください。
        </p>
      </div>
    </div>
  );
}
