"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, FileText, X, Filter, Tag as TagIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArticleForm } from "./article-form";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "学内ニュース",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
};

/**
 * 分類に応じた固有のカラークラスを返却
 */
const getTagColor = (tag: string, isActive: boolean) => {
  const colorMap: Record<string, string> = {
    "学内ニュース": "bg-blue-600",
    "イベント": "bg-green-600",
    "インタビュー": "bg-purple-600",
    "スポーツ": "bg-orange-600",
    "コラム": "bg-pink-600",
    "オピニオン": "bg-cyan-600",
  };

  if (!isActive) return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";

  // 選択中は固有のカラー、それ以外（カスタムタグ）はローズレッド
  const baseColor = colorMap[tag] || "bg-rose-500";
  return `${baseColor} text-white border-transparent shadow-sm`;
};

export function ArticleManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "articles"), 
      where("articleType", "==", "Standard"),
      orderBy("publishDate", "desc")
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(articlesQuery);

  const allTags = useMemo(() => {
    if (!articles) return [];
    const tagsSet = new Set<string>();
    
    // カテゴリーを追加
    Object.values(CATEGORY_LABELS).forEach(label => tagsSet.add(label));
    
    // 記事のカスタムタグを追加
    articles.forEach(article => {
      article.tags?.forEach((tag: string) => {
        if (tag && tag.trim()) tagsSet.add(tag.trim());
      });
    });
    
    return Array.from(tagsSet).sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (selectedTags.length === 0) return articles;

    return articles.filter(article => {
      const articleTags = [
        CATEGORY_LABELS[article.categoryId] || article.categoryId,
        ...(article.tags || [])
      ];
      return selectedTags.every(tag => articleTags.includes(tag));
    });
  }, [articles, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const confirmDelete = () => {
    if (!articleToDelete || !firestore) return;
    const docRef = doc(firestore, "articles", articleToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました", description: `「${articleToDelete.title}」を削除しました。` });
    setArticleToDelete(null);
  };

  if (isEditing) {
    return (
      <Card className="animate-in fade-in zoom-in duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <div>
            <CardTitle>{currentArticle ? "学内記事を編集" : "新規学内記事の作成"}</CardTitle>
            <CardDescription>学内のニュースやコラムを作成・編集します。</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4 mr-2" /> 閉じる
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <ArticleForm article={currentArticle} onSuccess={() => setIsEditing(false)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">学内記事管理</h2>
          <p className="text-sm text-slate-500">学内限定公開ニュースおよびコラムの管理を行います。</p>
        </div>
        <Button onClick={() => { setCurrentArticle(null); setIsEditing(true); }} className="h-11 px-6 shadow-md gap-2">
          <Plus className="h-5 w-5" />
          新規記事作成
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-500 uppercase tracking-wider">
            <Filter className="h-4 w-4" />
            利用可能な分類
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
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95",
                    getTagColor(tag, isActive)
                  )}
                >
                  <TagIcon className={cn("h-3 w-3", isActive ? "text-white" : "text-slate-400")} />
                  {tag}
                  {isActive && <X className="h-3 w-3 ml-1 opacity-80 hover:opacity-100" />}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <Button variant="link" size="sm" onClick={() => setSelectedTags([])} className="text-xs text-slate-400 font-bold hover:text-primary">
                すべて解除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[120px]">ステータス</TableHead>
                  <TableHead>記事情報 / カテゴリー</TableHead>
                  <TableHead>タグ</TableHead>
                  <TableHead>公開日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      {article.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">公開中</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50">下書き</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 leading-tight">{article.title}</span>
                        <span className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider">
                          {CATEGORY_LABELS[article.categoryId] || article.categoryId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.tags?.map((tag: string, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-500">
                      {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentArticle(article); setIsEditing(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setArticleToDelete(article)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredArticles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-10 w-10 opacity-20" />
                        <p className="font-medium">一致する記事が見つかりませんでした。</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              記事を完全に削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              「{articleToDelete?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
