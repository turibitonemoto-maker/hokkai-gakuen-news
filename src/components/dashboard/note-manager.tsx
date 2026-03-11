
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Share2, RefreshCw, Loader2, ExternalLink, Globe, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import Image from "next/image";

export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "articles"), 
      where("articleType", "==", "Note"),
      orderBy("publishDate", "desc")
    );
  }, [firestore]);

  const { data: noteArticles, isLoading } = useCollection(noteArticlesQuery);

  const handleSync = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    try {
      const articles = await fetchNoteArticles();
      articles.forEach(article => {
        const docRef = doc(firestore, "articles", article.id);
        // 既存のドキュメントがある場合は公開状態(isPublished)を維持し、それ以外を更新する
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">note連動管理</h2>
          <p className="text-sm text-slate-500">外部メディア（note）の記事を同期し、公式サイトへの表示を制御します。</p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2 h-11 px-6 shadow-lg shadow-purple-200"
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
                  <TableRow>
                    <TableHead>サイト表示</TableHead>
                    <TableHead>記事情報</TableHead>
                    <TableHead>公開日</TableHead>
                    <TableHead className="text-right">リンク</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noteArticles?.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={article.isPublished} 
                            onCheckedChange={(checked) => togglePublished(article, checked)}
                          />
                          {article.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] h-5">公開中</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">非表示</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3 items-center">
                          {article.mainImageUrl && (
                            <div className="relative h-10 w-16 rounded overflow-hidden flex-shrink-0 border bg-slate-100">
                              <Image src={article.mainImageUrl} alt="" fill className="object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-sm">{article.title}</span>
                            <span className="text-[10px] text-slate-400">ID: {article.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={article.noteUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!noteArticles || noteArticles.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-slate-400">
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
              <CardTitle className="text-base font-bold">同期の仕組み</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500 space-y-4">
              <div className="flex gap-3">
                <div className="bg-slate-100 p-2 rounded-lg h-fit"><RefreshCw className="h-4 w-4" /></div>
                <p>noteに投稿した最新記事を自動的にスキャンしてデータベースに追加します。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-100 p-2 rounded-lg h-fit"><Globe className="h-4 w-4" /></div>
                <p>初期状態は「非表示」で登録されます。公開したい記事のスイッチをオンにしてください。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-100 p-2 rounded-lg h-fit"><ShieldAlert className="h-4 w-4" /></div>
                <p>学内記事とは別のエリアで管理するため、大事な内部向け記事を誤って消す心配がありません。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
