
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, FileText, Share2, ExternalLink, Tag, X, Filter, Search } from "lucide-react";
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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

  // タグで記事をフィルタリング（AND条件：すべての選択タグを含む記事）
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (selectedTags.length === 0) return articles;
    return articles.filter(article => 
      selectedTags.every(selectedTag => article.tags?.includes(selectedTag))
    );
  }, [articles, selectedTags]);

  const handleEdit = (article: any) => {
    setCurrentArticle(article);
    setIsEditing(true);
  };

  const handleAdd = () => {
    setCurrentArticle(null);
    setIsEditing(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const confirmDelete = () => {
    if (!articleToDelete || !firestore) return;
    const docRef = doc(firestore, "articles", articleToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: "削除しました",
      description: `「${articleToDelete.title}」を削除しました。`,
    });
    setArticleToDelete(null);
  };

  if (isEditing) {
    return (
      <Card className="animate-in fade-in duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <div>
            <CardTitle>{currentArticle ? "記事を編集" : "新しい記事を作成"}</CardTitle>
            <CardDescription>記事の内容や公開設定を編集します。</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>キャンセル</Button>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">記事管理</h2>
          <p className="text-sm text-slate-500">学内ニュースとnote連携記事を一括管理します。</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* 高度なフィルターUI */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/30 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
            <Search className="h-4 w-4" />
            記事の絞り込み
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* 選択中のタグ (タグチップ) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">選択中のフィルター:</div>
            <div className="flex flex-wrap gap-2 min-h-[40px] items-center p-3 rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50">
              {selectedTags.length > 0 ? (
                selectedTags.map(tag => (
                  <Badge 
                    key={tag} 
                    className="pl-3 pr-1 py-1 gap-1 bg-primary text-white hover:bg-primary shadow-sm border-none rounded-full"
                  >
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">タグを選択して記事を絞り込んでください</span>
              )}
              {selectedTags.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTags([])}
                  className="text-xs h-7 text-slate-400 hover:text-destructive"
                >
                  すべてクリア
                </Button>
              )}
            </div>
          </div>

          {/* 利用可能なタグ一覧 */}
          {!isLoading && allTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Tag className="h-3 w-3" />
                利用可能なタグ:
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Button
                      key={tag}
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 rounded-full text-xs transition-all",
                        isSelected ? "opacity-50 cursor-not-allowed bg-slate-100" : "hover:border-primary hover:text-primary"
                      )}
                      onClick={() => !isSelected && toggleTag(tag)}
                      disabled={isSelected}
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[100px]">タイプ</TableHead>
                  <TableHead className="w-[120px]">状態</TableHead>
                  <TableHead>タイトル / 分類</TableHead>
                  <TableHead>タグ</TableHead>
                  <TableHead className="w-[120px]">公開日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group">
                    <TableCell>
                      {article.articleType === "Note" ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                          <Share2 className="h-3 w-3 mr-1" /> NOTE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                          <FileText className="h-3 w-3 mr-1" /> 標準
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">公開中</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500">下書き</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 line-clamp-1">{article.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{article.categoryId}</span>
                          {article.articleType === "Note" && (
                            <span className="text-[10px] text-slate-400 flex items-center">
                              <ExternalLink className="h-2.5 w-2.5 mr-1" /> note.com
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.tags?.map((tag: string, i: number) => (
                          <span 
                            key={i} 
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                              selectedTags.includes(tag)
                                ? "bg-primary text-white border-primary" 
                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                            )}
                            onClick={() => toggleTag(tag)}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setArticleToDelete(article)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredArticles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                      該当する記事が見つかりません。
                      {selectedTags.length > 0 && (
                        <Button variant="link" className="text-primary ml-2" onClick={() => setSelectedTags([])}>
                          条件をクリア
                        </Button>
                      )}
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
              「{articleToDelete?.title}」を削除します。この操作は取り消せません。
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
