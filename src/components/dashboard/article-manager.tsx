
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertTriangle, FileText, Share2, ExternalLink, Tag, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      article.tags?.forEach((tag: string) => tags.add(tag));
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{currentArticle ? "記事を編集" : "新しい記事を作成"}</CardTitle>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>一覧に戻る</Button>
        </CardHeader>
        <CardContent>
          <ArticleForm 
            article={currentArticle} 
            onSuccess={() => setIsEditing(false)} 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">記事管理</h2>
          <p className="text-sm text-slate-500">学内記事とnote連携記事をタグやカテゴリーで整理・管理します。</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* タグフィルター */}
      {!isLoading && allTags.length > 0 && (
        <Card className="bg-white/50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Tag className="h-3 w-3" /> タグで絞り込む:
              </span>
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                onClick={() => setSelectedTag(null)}
              >
                すべて
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs rounded-full flex items-center gap-1.5",
                    selectedTag === tag ? "bg-primary" : "hover:bg-slate-100"
                  )}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                  {selectedTag === tag && <X className="h-3 w-3 opacity-70" />}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイプ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead>タグ / カテゴリー</TableHead>
                  <TableHead>公開日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      {article.articleType === "Note" ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                          <Share2 className="h-3 w-3 mr-1" /> note
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                          <FileText className="h-3 w-3 mr-1" /> 標準
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.isPublished ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <Eye className="h-3 w-3 mr-1" /> 公開中
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" /> 下書き
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px]">
                      <div className="flex flex-col">
                        <span className="truncate">{article.title}</span>
                        {article.articleType === "Note" && article.noteUrl && (
                          <span className="text-[10px] text-slate-400 flex items-center mt-0.5">
                            <ExternalLink className="h-2 w-2 mr-1" /> {article.noteUrl}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Badge variant="outline" className="w-fit">{article.categoryId}</Badge>
                        <div className="flex flex-wrap gap-1">
                          {article.tags?.map((tag: string, i: number) => (
                            <Badge 
                              key={i} 
                              variant={selectedTag === tag ? "default" : "secondary"} 
                              className={cn(
                                "text-[9px] px-1.5 py-0 h-4 flex items-center gap-0.5 cursor-pointer transition-colors",
                                selectedTag === tag ? "" : "hover:bg-slate-200"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                            >
                              <Tag className="h-2 w-2" /> {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10" 
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
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      {selectedTag 
                        ? `タグ「${selectedTag}」に一致する記事は見つかりませんでした。` 
                        : "記事がありません。新しい記事を作成してください。"}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>記事を削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              「<span className="font-bold text-slate-900">{articleToDelete?.title}</span>」を削除します。
              {articleToDelete?.articleType === "Standard" ? "記事の本文データもすべて削除されます。" : "noteへのリンク設定が削除されます。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
