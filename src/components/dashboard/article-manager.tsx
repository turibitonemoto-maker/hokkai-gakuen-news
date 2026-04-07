"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, Filter, Tag as TagIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, extractCloudinaryUrls } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "キャンパス",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
};

export function ArticleManager() {
  const router = useRouter();
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "articles"), 
      orderBy("publishDate", "desc")
    );
  }, [firestore, user]);

  const { data: allArticles, isLoading, error } = useCollection(articlesQuery);

  const filteredArticles = useMemo(() => {
    if (!allArticles) return [];
    const baseArticles = allArticles.filter(a => a.categoryId !== "Viewer");
    if (selectedTags.length === 0) return baseArticles;
    return baseArticles.filter(article => {
      const articleTags = [
        CATEGORY_LABELS[article.categoryId] || article.categoryId,
        ...(article.tags || [])
      ];
      return selectedTags.every(tag => articleTags.includes(tag));
    });
  }, [allArticles, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleTogglePublish = (article: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    updateDocumentNonBlocking(docRef, { 
      isPublished: !article.isPublished,
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    });
    toast({ title: !article.isPublished ? "公開しました" : "非公開にしました" });
  };

  const confirmDelete = async () => {
    if (!articleToDelete || !firestore) return;
    setIsDeleting(true);
    
    try {
      const contentImages = extractCloudinaryUrls(articleToDelete.content || "");
      const urlsToDel = [...contentImages];
      if (articleToDelete.mainImageUrl) urlsToDel.push(articleToDelete.mainImageUrl);
      
      if (urlsToDel.length > 0) {
        await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: urlsToDel }),
        });
      }

      deleteDocumentNonBlocking(doc(firestore, "articles", articleToDelete.id));
      toast({ title: "削除しました" });
    } catch (e) {
      console.error("Delete error:", e);
      toast({ variant: "destructive", title: "削除失敗" });
    } finally {
      setIsDeleting(false);
      setArticleToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">記事管理</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">作成した記事の公開・編集を管理します。</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="rounded-xl h-12 w-12 border-slate-200">
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </Button>
          <Button onClick={() => router.push('/admin/new')} className="flex-1 md:flex-none h-12 px-6 shadow-lg gap-2 font-black rounded-2xl">
            <Plus className="h-5 w-5" />
            新規記事作成
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>同期エラー</AlertTitle>
          <AlertDescription>データの取得に失敗しました。</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm overflow-hidden border-slate-200 rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[180px] font-black text-xs uppercase tracking-widest">公開状態</TableHead>
                    <TableHead className="min-w-[300px] font-black text-xs uppercase tracking-widest">タイトル</TableHead>
                    <TableHead className="min-w-[120px] font-black text-xs uppercase tracking-widest">公開日</TableHead>
                    <TableHead className="text-right font-black text-xs uppercase tracking-widest px-8">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id} className="group hover:bg-slate-50/80 transition-colors border-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={article.isPublished} 
                            onCheckedChange={() => handleTogglePublish(article)}
                            className="data-[state=checked]:bg-green-500 scale-90 md:scale-100"
                          />
                          {article.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 shadow-none font-black text-[10px]">公開中</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-black text-[10px]">下書き</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors text-sm md:text-base line-clamp-1">{article.title}</span>
                          <span className="text-[9px] font-black text-primary mt-1 uppercase tracking-widest">
                            {CATEGORY_LABELS[article.categoryId] || article.categoryId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-500">
                        {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/edit/${article.id}`)} className="rounded-full hover:bg-primary/10 hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setArticleToDelete(article)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>
      </Card>

      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && !isDeleting && setArticleToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none p-10">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <Trash2 className="h-6 w-6" />
              <AlertDialogTitle className="text-2xl font-black">記事を完全に消去しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold text-slate-500">
              「{articleToDelete?.title}」のデータを完全に抹消します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12" disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12 px-8">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              削除を確定する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
