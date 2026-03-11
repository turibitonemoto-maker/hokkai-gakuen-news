
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertTriangle, FileText, Share2, ExternalLink, Tag, X, Filter } from "lucide-react";
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

export function ArticleManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "articles"), orderBy("publishDate", "desc"));
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(articlesQuery);

  // 全記事からユニークなタグを抽出
  const allTags = useMemo(() => {
    if (!articles) return [];
    const tags = new Set<string>();
    articles.forEach(article => {
      article.tags?.forEach((tag: string) => {
        if (tag && tag.trim()) tags.add(tag.trim());
      });
    });
    return Array.from(tags).sort();
  }, [articles]);

  // 選択されたタグで記事をフィルタリング
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (!selectedTag) return articles;
    return articles.filter(article => article.tags?.includes(selectedTag));
  }, [articles, selectedTag]);

  const handleEdit = (article: any) => {
    setCurrentArticle(article);
    setIsEditing(true);
  };

  const handleAdd = () => {
    setCurrentArticle(null);
    setIsEditing(true);
  };

  const confirmDelete = () => {
    if (!articleToDelete || !firestore) return;
    
    const docRef = doc(firestore, "articles", articleToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "記事を削除しました",
      description: `「${articleToDelete.title}」を削除しました。`,
    });
    
    setArticleToDelete(null);
  };

  if (isEditing) {
    return (
      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <div>
            <CardTitle>{currentArticle ? "記事を編集" : "新しい記事を作成"}</CardTitle>
            <CardDescription>記事の内容や公開設定を編集します。</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>一覧に戻る</Button>
        </CardHeader>
        <CardContent className="pt-6">
          <ArticleForm 
            article={currentArticle} 
            onSuccess={() => setIsEditing(false)} 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">記事管理</h2>
          <p className="text-sm text-slate-500 mt-1">学内記事とnote連携記事をタグやカテゴリーで整理・管理します。</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* タグフィルターセクション */}
      {!isLoading && allTags.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">絞り込みフィルター</span>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 px-4 rounded-full text-xs font-bold transition-all",
                  selectedTag === null ? "shadow-md" : "text-slate-500 hover:bg-slate-100"
                )}
                onClick={() => setSelectedTag(null)}
              >
                すべて表示
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-2",
                    selectedTag === tag 
                      ? "bg-primary text-white shadow-md" 
                      : "text-slate-600 border-slate-200 hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => setSelectedTag(tag)}
                >
                  <Tag className="h-3 w-3 opacity-70" />
                  {tag}
                  {selectedTag === tag && <X className="h-3 w-3 ml-1 opacity-70" />}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-slate-400 font-medium">記事データを読み込み中...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] font-bold text-slate-600">タイプ</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-600">ステータス</TableHead>
                  <TableHead className="font-bold text-slate-600">タイトル</TableHead>
                  <TableHead className="font-bold text-slate-600">分類</TableHead>
                  <TableHead className="w-[150px] font-bold text-slate-600">公開日</TableHead>
                  <TableHead className="text-right font-bold text-slate-600">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group transition-colors hover:bg-slate-50/80">
                    <TableCell>
                      {article.articleType === "Note" ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 font-bold text-[10px]">
                          <Share2 className="h-3 w-3 mr-1.5" /> NOTE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-bold text-[10px]">
                          <FileText className="h-3 w-3 mr-1.5" /> 標準
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.isPublished ? (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          公開中
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          下書き
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                          {article.title}
                        </span>
                        {article.articleType === "Note" && (
                          <span className="text-[10px] text-slate-400 flex items-center truncate">
                            <ExternalLink className="h-2.5 w-2.5 mr-1 shrink-0" />
                            {article.noteUrl}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className="w-fit text-[10px] bg-slate-100 text-slate-600 border-none font-bold">
                          {article.categoryId}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {article.tags?.map((tag: string, i: number) => (
                            <span 
                              key={i} 
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer",
                                selectedTag === tag 
                                  ? "bg-primary text-white border-primary shadow-sm" 
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag === selectedTag ? null : tag);
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-500 whitespace-nowrap">
                      {new Date(article.publishDate).toLocaleDateString("ja-JP", {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => setArticleToDelete(article)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredArticles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Filter className="h-10 w-10 opacity-20 mb-2" />
                        <p className="text-sm font-bold">該当する記事が見つかりません</p>
                        <p className="text-xs">
                          {selectedTag 
                            ? `タグ「${selectedTag}」に一致する記事はありません。` 
                            : "まだ記事が1件も登録されていません。"}
                        </p>
                        {selectedTag && (
                          <Button 
                            variant="link" 
                            className="text-primary font-bold text-xs mt-2"
                            onClick={() => setSelectedTag(null)}
                          >
                            すべての記事を表示する
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">記事を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 leading-relaxed">
              「<span className="font-bold text-slate-900">{articleToDelete?.title}</span>」を削除しようとしています。
              この操作は取り消すことができず、記事の全データがシステムから完全に失われます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-full font-bold">キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full font-bold px-8"
            >
              削除を実行する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
