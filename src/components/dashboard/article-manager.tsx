
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, X, Filter, Tag as TagIcon, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArticleForm } from "./article-form";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "キャンパス",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
  Viewer: "紙面ビューアー",
};

const getTagColor = (tag: string, isActive: boolean) => {
  const colorMap: Record<string, string> = {
    "キャンパス": "bg-blue-500",
    "イベント": "bg-emerald-500",
    "インタビュー": "bg-violet-500",
    "スポーツ": "bg-amber-500",
    "コラム": "bg-rose-500",
    "オピニオン": "bg-indigo-500",
    "紙面ビューアー": "bg-red-600",
  };

  if (!isActive) return "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-600";

  const baseColor = colorMap[tag] || "bg-primary";
  return `${baseColor} text-white border-transparent shadow-md ring-2 ring-offset-1 ring-primary/20`;
};

export function ArticleManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(CATEGORY_LABELS).forEach(label => tagsSet.add(label));
    allArticles?.forEach(article => {
      article.tags?.forEach((tag: string) => {
        if (tag && tag.trim()) tagsSet.add(tag.trim());
      });
    });
    return Array.from(tagsSet);
  }, [allArticles]);

  const filteredArticles = useMemo(() => {
    if (!allArticles) return [];
    if (selectedTags.length === 0) return allArticles;

    return allArticles.filter(article => {
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

    toast({ 
      title: !article.isPublished ? "公開しました" : "非公開にしました", 
      description: `「${article.title}」の公開設定を切り替えました。` 
    });
  };

  const confirmDelete = () => {
    if (!articleToDelete || !firestore) return;
    const docRef = doc(firestore, "articles", articleToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました", description: `「${articleToDelete.title}」をデータベースから完全に抹消しました。` });
    setArticleToDelete(null);
  };

  if (isEditing) {
    return (
      <Card className="animate-in fade-in zoom-in duration-300 rounded-2xl md:rounded-3xl border-none shadow-xl overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50/50 p-6 md:p-8">
          <div>
            <CardTitle className="text-xl md:text-2xl font-black">{currentArticle ? "記事を編集" : "新規記事の作成"}</CardTitle>
            <CardDescription className="font-bold">
              学内のニュースやコラムを作成・編集します。
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)} className="mt-4 md:mt-0 font-bold rounded-full">
            <X className="h-4 w-4 mr-2" /> 閉じる
          </Button>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <ArticleForm article={currentArticle} onSuccess={() => setIsEditing(false)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">記事・公開管理</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">オリジナル記事をリアルタイムに管理・監視します。</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="rounded-xl h-12 w-12 border-slate-200">
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </Button>
          <Button onClick={() => { setCurrentArticle(null); setIsEditing(true); }} className="flex-1 md:flex-none h-12 px-6 shadow-lg gap-2 font-black rounded-2xl">
            <Plus className="h-5 w-5" />
            新規記事作成
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>同期エラー</AlertTitle>
          <AlertDescription>データの取得に失敗しました。ページを再読み込みしてください。</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b bg-slate-50/30">
          <CardTitle className="text-xs font-black flex items-center gap-2 text-slate-500 uppercase tracking-widest">
            <Filter className="h-4 w-4" />
            カテゴリーフィルター
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black border transition-all duration-200 transform hover:translate-y-[-1px]",
                    getTagColor(tag, isActive)
                  )}
                >
                  <TagIcon className={cn("h-3 w-3", isActive ? "text-white" : "text-slate-400")} />
                  {tag}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="text-xs text-slate-400 font-bold hover:text-slate-600 h-auto p-2">
                リセット
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <TableHead className="w-[100px] font-black text-xs uppercase tracking-widest text-center">PV</TableHead>
                    <TableHead className="text-right font-black text-xs uppercase tracking-widest">操作</TableHead>
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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="text-xs">{(article.viewCount || 0).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setCurrentArticle(article); setIsEditing(true); }} className="rounded-full hover:bg-primary/10 hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setArticleToDelete(article)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredArticles.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-slate-300 font-black italic">
                        表示する記事がありません。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>
      </Card>

      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none p-10">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <Trash2 className="h-6 w-6" />
              <AlertDialogTitle className="text-2xl font-black">記事を完全に消去しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold text-slate-500">
              「{articleToDelete?.title}」をデータベースから完全に抹消します。<br />この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12 px-8">削除を確定する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
