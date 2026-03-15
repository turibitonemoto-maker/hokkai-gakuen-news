"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, BookOpen, ImageIcon, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PaperForm } from "./paper-form";
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
  const [currentPaper, setCurrentPaper] = useState<any>(null);
  const [paperToDelete, setPaperToDelete] = useState<any>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const { data: allArticles, isLoading, error } = useCollection(articlesQuery);

  const viewerArticles = useMemo(() => {
    if (!allArticles) return [];
    return allArticles
      .filter(a => a.categoryId === "Viewer")
      .sort((a, b) => {
        const dateA = a.publishDate || "";
        const dateB = b.publishDate || "";
        return dateB.localeCompare(dateA);
      });
  }, [allArticles]);

  const handleTogglePublish = (article: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    updateDocumentNonBlocking(docRef, { isPublished: !article.isPublished });
    toast({ title: article.isPublished ? "非公開にしました" : "公開しました" });
  };

  const confirmDelete = () => {
    if (!paperToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "articles", paperToDelete.id));
    toast({ title: "削除しました" });
    setPaperToDelete(null);
  };

  if (isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{currentPaper ? `第 ${currentPaper.issueNumber} 号を編集` : "新しい紙面を登録"}</h2>
            <p className="text-sm font-bold text-slate-500">紙面画像をアップロードしてアーカイブを構築します。</p>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)} className="font-bold rounded-full">戻る</Button>
        </div>
        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
          <CardContent className="p-10">
            <PaperForm paper={currentPaper} onSuccess={() => setIsEditing(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            紙面ビューアー管理
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">電子版新聞の配信・アーカイブを統制します。</p>
        </div>
        <Button onClick={() => { setCurrentPaper(null); setIsEditing(true); }} className="h-12 px-8 shadow-lg gap-2 font-black rounded-2xl bg-primary">
          <Plus className="h-5 w-5" /> 紙面を追加
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-slate-200 rounded-[2rem] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[100px] font-black text-xs uppercase text-center">公開</TableHead>
                  <TableHead className="w-[100px] font-black text-xs uppercase text-center">号数</TableHead>
                  <TableHead className="min-w-[250px] font-black text-xs uppercase">タイトル</TableHead>
                  <TableHead className="w-[150px] font-black text-xs uppercase text-center">発行日</TableHead>
                  <TableHead className="w-[150px] font-black text-xs uppercase text-center">ページ数</TableHead>
                  <TableHead className="text-right font-black text-xs uppercase px-8">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewerArticles.map((article) => (
                  <TableRow key={article.id} className="group hover:bg-slate-50/80 transition-colors border-slate-50">
                    <TableCell className="text-center">
                      <Switch checked={article.isPublished} onCheckedChange={() => handleTogglePublish(article)} className="scale-90" />
                    </TableCell>
                    <TableCell className="text-center font-black text-slate-400">
                      第 {article.issueNumber} 号
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{article.title}</span>
                        {article.mainImageUrl && <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1 mt-1"><CheckCircle2 className="h-2 w-2" /> Thumbnail Set</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-500 text-sm">
                      {article.publishDate}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-black text-[10px] gap-1 px-3 py-1 bg-slate-50 border-slate-200">
                        <ImageIcon className="h-3 w-3" /> {(article.paperImages?.length || 0)} ページ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentPaper(article); setIsEditing(true); }} className="rounded-full hover:bg-primary/10">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setPaperToDelete(article)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {viewerArticles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24 text-slate-300 font-black italic">
                      登録されている紙面データがありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && setPaperToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none p-10">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <Trash2 className="h-6 w-6" />
              <AlertDialogTitle className="text-2xl font-black">紙面データを消去しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold text-slate-500">
              この操作は取り消せません。データベースから完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12 px-8">削除を確定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
