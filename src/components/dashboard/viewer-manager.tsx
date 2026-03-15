
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, orderBy, query, where, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Eye, FileType, BookOpen } from "lucide-react";
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

export function ViewerManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const viewerQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "articles"), 
      where("categoryId", "==", "Viewer"),
      orderBy("publishDate", "desc")
    );
  }, [firestore, user]);

  const { data: viewerArticles, isLoading, error } = useCollection(viewerQuery);

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
      description: `紙面の公開設定を切り替えました。` 
    });
  };

  const confirmDelete = () => {
    if (!articleToDelete || !firestore) return;
    const docRef = doc(firestore, "articles", articleToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました", description: `紙面データを抹消しました。` });
    setArticleToDelete(null);
  };

  if (isEditing) {
    return (
      <Card className="animate-in fade-in zoom-in duration-300 rounded-[2rem] border-none shadow-xl overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50/50 p-8">
          <div>
            <CardTitle className="text-2xl font-black">紙面の管理</CardTitle>
            <CardDescription className="font-bold">
              GoogleドライブのPDFリンクを設定し、デジタル紙面を配信します。
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)} className="mt-4 md:mt-0 font-bold rounded-full">
            一覧に戻る
          </Button>
        </CardHeader>
        <CardContent className="p-10">
          <ArticleForm 
            article={currentArticle || { categoryId: "Viewer", articleType: "Standard" }} 
            onSuccess={() => setIsEditing(false)} 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            紙面ビューアー管理
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">電子版新聞の配信・アーカイブを統制します。</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="rounded-xl h-12 w-12 border-slate-200">
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </Button>
          <Button onClick={() => { setCurrentArticle(null); setIsEditing(true); }} className="flex-1 md:flex-none h-12 px-8 shadow-lg gap-2 font-black rounded-2xl">
            <Plus className="h-5 w-5" />
            紙面を追加
          </Button>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden border-slate-200 rounded-[2rem] bg-white">
        <div className="overflow-x-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[180px] font-black text-xs uppercase tracking-widest px-8">公開状態</TableHead>
                    <TableHead className="min-w-[300px] font-black text-xs uppercase tracking-widest">紙面タイトル（号数など）</TableHead>
                    <TableHead className="min-w-[120px] font-black text-xs uppercase tracking-widest text-center">発行日</TableHead>
                    <TableHead className="w-[150px] font-black text-xs uppercase tracking-widest text-center">PDFリンク</TableHead>
                    <TableHead className="text-right font-black text-xs uppercase tracking-widest px-8">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewerArticles?.map((article) => (
                    <TableRow key={article.id} className="group hover:bg-slate-50/80 transition-colors border-slate-50">
                      <TableCell className="px-8">
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={article.isPublished} 
                            onCheckedChange={() => handleTogglePublish(article)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          {article.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 font-black text-[10px]">公開中</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-black text-[10px]">下書き</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">{article.title}</span>
                          <span className="text-[9px] font-black text-primary mt-1 uppercase tracking-widest">Digital Edition</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-500 text-sm">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-center">
                        {article.pdfUrl ? (
                          <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 font-black text-[9px] uppercase tracking-tighter">
                            <FileType className="h-3 w-3 mr-1" /> PDF Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-300 font-bold text-[9px]">No PDF</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-8">
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
                  {viewerArticles?.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-24 text-slate-300 font-black italic">
                        登録されている紙面データがありません。
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
              <AlertDialogTitle className="text-2xl font-black">紙面データを消去しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold text-slate-500">
              「{articleToDelete?.title}」の全情報を抹消します。この操作は取り消せません。
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
