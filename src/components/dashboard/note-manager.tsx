
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
  Pencil, 
  ArrowLeft, 
  PlusCircle, 
  CheckCircle2, 
  FileText,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import { ArticleForm } from "./article-form";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [rssArticles, setRssArticles] = useState<any[]>([]);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Firestoreにある取り込み済みのnote記事を取得
  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "articles"), 
      orderBy("publishDate", "desc")
    );
  }, [firestore, user]);

  const { data: allArticles, isLoading: isDbLoading } = useCollection(noteArticlesQuery);

  const dbNoteArticles = useMemo(() => {
    if (!allArticles) return [];
    return allArticles.filter(a => a.articleType === "Note");
  }, [allArticles]);

  // 初回起動時または同期ボタン押下時にRSSを取得
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      setRssArticles(articles);
      toast({ title: "同期完了", description: "noteから最新の記事候補を読み込みました。" });
    } catch (e) {
      toast({ variant: "destructive", title: "エラー", description: "noteの取得に失敗しました。" });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  // サイトに取り込む（下書きとして保存）
  const handleImport = (article: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    
    // 下書き状態で保存
    setDocumentNonBlocking(docRef, {
      ...article,
      isPublished: false, // ユーザーの要望通り、取り込み時は下書き扱い
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    toast({ 
      title: "取り込み完了", 
      description: `「${article.title}」を下書きとして追加しました。記事管理から公開設定を行ってください。` 
    });
  };

  if (isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">note記事を編集</h2>
            <p className="text-sm text-slate-500">タイトル、公開設定、タグなどを変更できます。</p>
          </div>
        </div>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <ArticleForm article={currentArticle} onSuccess={() => setIsEditing(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">note連動管理</h2>
          <p className="text-sm text-slate-500">外部メディア（note）の記事を取り込み、公式サイトへの掲載を管理します。</p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2 h-11 px-6 shadow-lg shadow-purple-200 font-bold"
        >
          {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          最新情報を取得
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* ステップ1: 取り込み候補（RSS） */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-purple-50/50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                  <Share2 className="h-5 w-5" />
                  取り込み候補（note最新記事）
                </CardTitle>
                <CardDescription>公式サイトに未追加の記事をここから「下書き」として取り込めます。</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white">{rssArticles.length}件の候補</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isSyncing ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>記事情報</TableHead>
                    <TableHead>公開日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rssArticles.map((article) => {
                    const existing = dbNoteArticles.find(db => db.id === article.id);
                    return (
                      <TableRow key={article.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex gap-4 items-center py-2">
                            {article.mainImageUrl && (
                              <div className="relative h-14 w-24 rounded-lg overflow-hidden flex-shrink-0 border bg-slate-100 shadow-sm">
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
                              <span className="font-bold text-slate-800 truncate text-sm leading-tight">{article.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-2 w-2" /> noteで開く
                                </a>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium whitespace-nowrap">
                          {article.publishDate}
                        </TableCell>
                        <TableCell className="text-right">
                          {existing ? (
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> 取り込み済み
                              </Badge>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {existing.isPublished ? "公開中" : "下書き"}
                              </span>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleImport(article)}
                              className="h-9 gap-2 font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                            >
                              <PlusCircle className="h-4 w-4" />
                              サイトに取り込む
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rssArticles.length === 0 && !isSyncing && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-20 text-slate-400 font-medium italic">
                        現在、候補となる記事が見つかりません。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ステップ2: 取り込み済み（Firestore） */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                  <FileText className="h-5 w-5" />
                  取り込み済みの記事（公開・編集）
                </CardTitle>
                <CardDescription>サイトに追加されたnote記事のステータス変更や内容の編集ができます。</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white">{dbNoteArticles.length}件</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isDbLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>ステータス</TableHead>
                    <TableHead>記事タイトル</TableHead>
                    <TableHead>公開日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbNoteArticles.map((article) => (
                    <TableRow key={article.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        {article.isPublished ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none font-bold">
                            <Eye className="h-3 w-3 mr-1" /> 公開中
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-bold">
                            <FileText className="h-3 w-3 mr-1" /> 下書き
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-800 text-sm leading-tight">{article.title}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setCurrentArticle(article); setIsEditing(true); }}
                          className="h-8 gap-1 px-3 font-bold border-primary/20 text-primary hover:bg-primary/5"
                        >
                          <Pencil className="h-3 w-3" />
                          編集・公開設定
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dbNoteArticles.length === 0 && !isDbLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium italic">
                        サイトに取り込まれた記事はまだありません。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
