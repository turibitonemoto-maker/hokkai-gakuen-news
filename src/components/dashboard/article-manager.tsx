"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, X, Filter, Tag as TagIcon, AlertCircle, Share2, FileText } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
 * カテゴリー・タイプに応じた固有のカラーを返却
 */
const getTagColor = (tag: string, isActive: boolean) => {
  const colorMap: Record<string, string> = {
    "学内ニュース": "bg-blue-500",
    "イベント": "bg-emerald-500",
    "インタビュー": "bg-violet-500",
    "スポーツ": "bg-amber-500",
    "コラム": "bg-rose-500",
    "オピニオン": "bg-indigo-500",
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
    return Array.from(tagsSet).sort();
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
            <CardTitle>{currentArticle ? "記事を編集" : "新規記事の作成"}</CardTitle>
            <CardDescription>
              {currentArticle?.articleType === "Note" ? "noteから取り込んだ記事の公開設定を編集します。" : "学内のニュースやコラムを作成・編集します。"}
            </CardDescription>
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
          <h2 className="text-2xl font-bold text-slate-800">全記事・公開管理</h2>
          <p className="text-sm text-slate-500">作成した記事やnoteから取り込んだ記事の、公開・非公開を一括管理します。</p>
        </div>
        <Button onClick={() => { setCurrentArticle(null); setIsEditing(true); }} className="h-11 px-6 shadow-md gap-2 font-bold">
          <Plus className="h-5 w-5" />
          新規学内記事作成
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>データの読み込みに失敗しました</AlertTitle>
          <AlertDescription>
            データベースへのアクセス権限がないか、通信エラーが発生しています。
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-500 uppercase tracking-widest">
            <Filter className="h-4 w-4" />
            カテゴリー・タグ フィルター
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
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 transform hover:translate-y-[-1px]",
                    getTagColor(tag, isActive)
                  )}
                >
                  <TagIcon className={cn("h-3 w-3", isActive ? "text-white" : "text-slate-400")} />
                  {tag}
                  {isActive && <X className="h-3 w-3 ml-1 opacity-80" />}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTags([])} 
                className="text-xs text-slate-400 font-bold hover:text-slate-600 h-auto p-2 ml-2"
              >
                フィルター解除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[100px]">状態</TableHead>
                  <TableHead className="w-[100px]">タイプ</TableHead>
                  <TableHead>記事タイトル / カテゴリー</TableHead>
                  <TableHead>公開予定日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      {article.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none font-bold">公開中</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-bold">下書き</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.articleType === "Note" ? (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-purple-100 gap-1 px-2">
                          <Share2 className="h-3 w-3" /> note
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 gap-1 px-2">
                          <FileText className="h-3 w-3" /> 学内
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">{article.title}</span>
                        <span className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">
                          {CATEGORY_LABELS[article.categoryId] || article.categoryId}
                        </span>
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
                {filteredArticles.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
                      表示できる記事はありません。
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
              記事を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              「{articleToDelete?.title}」を完全に削除します。
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
