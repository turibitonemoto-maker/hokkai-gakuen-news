
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, FileText, X, Filter } from "lucide-react";
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
 * 分類（タグ名）に応じたカラークラスを返却
 */
const getTagColorClasses = (tag: string, isSelected: boolean) => {
  const colorMap: Record<string, { active: string; inactive: string }> = {
    "学内ニュース": { active: "bg-blue-600 text-white border-blue-600", inactive: "bg-blue-50 text-blue-600 border-blue-200" },
    "イベント": { active: "bg-green-600 text-white border-green-600", inactive: "bg-green-50 text-green-600 border-green-200" },
    "インタビュー": { active: "bg-purple-600 text-white border-purple-600", inactive: "bg-purple-50 text-purple-600 border-purple-200" },
    "スポーツ": { active: "bg-orange-600 text-white border-orange-600", inactive: "bg-orange-50 text-orange-600 border-orange-200" },
    "コラム": { active: "bg-pink-600 text-white border-pink-600", inactive: "bg-pink-50 text-pink-600 border-pink-200" },
    "オピニオン": { active: "bg-cyan-600 text-white border-cyan-600", inactive: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  };

  if (isSelected) {
    // 選択時は画像のような赤いバッジを優先
    return "bg-rose-500 text-white border-rose-600";
  }

  if (colorMap[tag]) {
    return colorMap[tag].inactive;
  }

  // 自由入力タグの場合
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variants = [
    "bg-slate-50 text-slate-600 border-slate-200",
    "bg-indigo-50 text-indigo-600 border-indigo-200",
    "bg-teal-50 text-teal-600 border-teal-200",
  ];
  return variants[hash % variants.length];
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
    const tags = new Set<string>();
    Object.values(CATEGORY_LABELS).forEach(label => tags.add(label));
    articles.forEach(article => {
      article.tags?.forEach((tag: string) => {
        if (tag && tag.trim()) tags.add(tag.trim());
      });
    });
    return Array.from(tags).sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (selectedTags.length === 0) return articles;

    return articles.filter(article => 
      selectedTags.every(selectedTag => {
        const categoryLabel = CATEGORY_LABELS[article.categoryId] || article.categoryId;
        const hasTag = article.tags && article.tags.includes(selectedTag);
        const isInCategory = categoryLabel === selectedTag;
        return hasTag || isInCategory;
      })
    );
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>{currentArticle ? "学内記事を編集" : "新しい学内記事を作成"}</CardTitle>
            <CardDescription>学内ニュースの内容を編集します。</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>キャンセル</Button>
        </CardHeader>
        <CardContent className="pt-6">
          <ArticleForm article={currentArticle} onSuccess={() => setIsEditing(false)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">学内記事管理</h2>
          <p className="text-sm text-slate-500">学内ニュースとコラムを管理します。</p>
        </div>
        <div className="flex gap-2">
          {selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="text-xs text-slate-400">
              フィルター解除
            </Button>
          )}
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
            <Filter className="h-4 w-4" />
            利用可能な分類
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 shadow-sm",
                    getTagColorClasses(tag, isSelected)
                  )}
                >
                  {tag}
                  {isSelected && <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>状態</TableHead>
                  <TableHead>タイトル / カテゴリー</TableHead>
                  <TableHead>タグ</TableHead>
                  <TableHead>公開日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group">
                    <TableCell>
                      {article.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">公開中</Badge>
                      ) : (
                        <Badge variant="secondary">下書き</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{article.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {CATEGORY_LABELS[article.categoryId] || article.categoryId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.tags?.map((tag: string, i: number) => (
                          <span key={i} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">#{tag}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentArticle(article); setIsEditing(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setArticleToDelete(article)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredArticles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400">
                      一致する記事が見つかりませんでした。
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
            <AlertDialogTitle>記事を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>「{articleToDelete?.title}」を削除します。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
