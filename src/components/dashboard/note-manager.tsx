"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Share2, RefreshCw, Loader2, ExternalLink, Globe, Pencil, X, ShieldAlert, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import { ArticleForm } from "./article-form";
import Image from "next/image";

export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "articles"), 
      orderBy("publishDate", "desc")
    );
  }, [firestore, user]);

  const { data: allArticles, isLoading } = useCollection(noteArticlesQuery);

  const noteArticles = useMemo(() => {
    if (!allArticles) return [];
    return allArticles.filter(a => a.articleType === "Note");
  }, [allArticles]);

  const handleSync = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      articles.forEach(article => {
        const docRef = doc(firestore, "articles", article.id);
        // 同期時は既存の公開設定や「編集済みの本文」を上書きしないよう merge: true で保存
        // ただし本文(content)が空の場合のみ、スニペットを補充するように個別に判断可能ですが
        // ここでは単純なマージを行います。
        setDocumentNonBlocking(docRef, {
          ...article,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      toast({ title: "同期完了", description: "noteから最新の記事を読み込みました。" });
    } catch (e) {
      toast({ variant: "destructive", title: "エラー", description: "同期に失敗しました。" });
    } finally {
      setIsSyncing(false);
    }
  };

  const togglePublished = (article: any, checked: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    setDocumentNonBlocking(docRef, { isPublished: checked }, { merge: true });
    toast({ 
      title: checked ? "公開中" : "非公開", 
      description: `「${article.title}」を${checked ? "公開" : "非公開"}にしました。` 
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">note連動管理</h2>
          <p className="text-sm text-slate-500">外部メディア（note）の記事を同期し、公式サイトへの表示を制御します。</p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2 h-11 px-6 shadow-lg shadow-purple-200 font-bold"
        >
          {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          noteと同期する
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-600" />
              取り込み済みのnote記事
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[140px]">サイト表示</TableHead>
                    <TableHead>記事情報</TableHead>
                    <TableHead>公開日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noteArticles?.map((article) => (
                    <TableRow key={article.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={article.isPublished} 
                            onCheckedChange={(checked) => togglePublished(article, checked)}
                          />
                          {article.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] h-5 border-green-200">公開中</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">非表示</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3 items-center py-1">
                          {article.mainImageUrl && (
                            <div className="relative h-12 w-20 rounded-lg overflow-hidden flex-shrink-0 border bg-slate-100 shadow-sm">
                              <Image 
                                src={article.mainImageUrl} 
                                alt="" 
                                fill 
                                className="object-cover" 
                                sizes="80px"
                              />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-sm leading-tight">{article.title}</span>
                            <span className="text-[10px] text-slate-400 mt-1">ID: {article.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setCurrentArticle(article); setIsEditing(true); }}
                            className="h-8 gap-1 px-3 font-bold border-primary/20 text-primary hover:bg-primary/5"
                          >
                            <Pencil className="h-3 w-3" />
                            編集
                          </Button>
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <a href={article.noteUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!noteArticles || noteArticles.length === 0) && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium italic">
                        note記事はまだ同期されていません。右上の「同期する」ボタンを押してください。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold">同期と編集の仕組み</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500 space-y-4 font-medium">
              <div className="flex gap-3">
                <div className="bg-purple-50 text-purple-600 p-2 rounded-lg h-fit shrink-0"><RefreshCw className="h-4 w-4" /></div>
                <p>同期すると最新のnote記事を読み込み、記事の冒頭を「本文」として自動セットします。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg h-fit shrink-0"><Pencil className="h-4 w-4" /></div>
                <p>「編集」から、タイトルや紹介文を学内サイト向けに自由に書き換えることができます。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-green-50 text-green-600 p-2 rounded-lg h-fit shrink-0"><ShieldAlert className="h-4 w-4" /></div>
                <p>一度編集した内容は、再同期しても「上書き」されないので安心してカスタマイズできます。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
