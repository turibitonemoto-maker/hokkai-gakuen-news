
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [isDeleting, setIsDeleting] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const papersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const { data: allArticles, isLoading } = useCollection(papersQuery);

  const viewerPapers = useMemo(() => {
    if (!allArticles) return [];
    return allArticles
      .filter(a => a.categoryId === "Viewer")
      .sort((a, b) => {
        const dateA = a.publishDate || "";
        const dateB = b.publishDate || "";
        return dateB.localeCompare(dateA);
      });
  }, [allArticles]);

  const handleTogglePublish = (paper: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", paper.id);
    updateDocumentNonBlocking(docRef, { 
      isPublished: !paper.isPublished,
      updatedAt: serverTimestamp() 
    });
    toast({ title: paper.isPublished ? "非公開にしました" : "公開しました" });
  };

  const confirmDelete = async () => {
    if (!paperToDelete || !firestore) return;
    setIsDeleting(true);
    
    try {
      // 1. Cloudinary上の画像を物理抹消
      if (paperToDelete.paperImages && paperToDelete.paperImages.length > 0) {
        await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: paperToDelete.paperImages }),
        });
      }

      // 2. Firestoreレコード抹消
      deleteDocumentNonBlocking(doc(firestore, "articles", paperToDelete.id));
      toast({ title: "削除しました", description: "画像ファイルも連動して抹消されました。" });
    } catch (e) {
      console.error("Delete sequence failed:", e);
      toast({ variant: "destructive", title: "連動消去エラー", description: "一部のファイルが残っている可能性があります。" });
    } finally {
      setIsDeleting(false);
      setPaperToDelete(null);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{currentPaper ? `「${currentPaper.title}」を編集` : "新しい紙面を登録"}</h2>
            <p className="text-sm font-bold text-slate-500">全てのページの画像をアップロードしてアーカイブを構築します。</p>
          </div>
          <Button variant="ghost" onClick={() => setIsEditing(false)} className="font-bold rounded-full text-slate-400">キャンセル</Button>
        </div>
        <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden bg-white">
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
            <div className="bg-primary/10 p-2 rounded-2xl">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            紙面ビューアー管理
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1 ml-1">マルチページ管理プロトコル：1950年からの歴史をデジタル化します。</p>
        </div>
        <Button onClick={() => { setCurrentPaper(null); setIsEditing(true); }} className="h-14 px-8 shadow-2xl gap-2 font-black rounded-2xl bg-primary text-white hover:bg-primary/90 hover:scale-105 transition-all">
          <Plus className="h-5 w-5" /> 紙面を追加
        </Button>
      </div>

      <Card className="shadow-sm overflow-hidden border-slate-200 rounded-[2.5rem] bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/50" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[100px] font-black text-[10px] uppercase text-center tracking-widest">公開</TableHead>
                  <TableHead className="min-w-[300px] font-black text-[10px] uppercase tracking-widest">タイトル / 構成</TableHead>
                  <TableHead className="w-[150px] font-black text-[10px] uppercase text-center tracking-widest">発行日</TableHead>
                  <TableHead className="w-[150px] font-black text-[10px] uppercase text-center tracking-widest">状態</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase px-8 tracking-widest">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewerPapers.map((paper) => (
                  <TableRow key={paper.id} className="group hover:bg-slate-50/80 transition-colors border-slate-50">
                    <TableCell className="text-center">
                      <Switch checked={paper.isPublished} onCheckedChange={() => handleTogglePublish(paper)} className="scale-90" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col py-2">
                        <span className="font-bold text-slate-800 text-base">{paper.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[9px] gap-1 px-2 py-0">
                            <Layers className="h-3 w-3" /> {(paper.paperImages?.length || 0)} PAGES
                          </Badge>
                          <span className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Synced
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-500 text-sm">
                      {paper.publishDate}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full uppercase">Archives</span>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentPaper(paper); setIsEditing(true); }} className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full transition-colors" onClick={() => setPaperToDelete(paper)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {viewerPapers.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32 text-slate-300">
                      <div className="flex flex-col items-center gap-4">
                        <BookOpen className="h-12 w-12 opacity-10" />
                        <p className="font-black text-lg italic opacity-50">アーカイブ・データがまだ刻まれていません。</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && !isDeleting && setPaperToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none p-10">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="bg-destructive/10 p-3 rounded-full">
                <Trash2 className="h-8 w-8" />
              </div>
              <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-800">紙面アーカイブを永久抹消しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold text-slate-500 py-4 leading-relaxed">
              「{paperToDelete?.title}」のデータおよびCloudinary上の画像実体は完全に削除されます。この操作は物理的に取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200" disabled={isDeleting}>作戦中止</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12 px-8 shadow-lg shadow-destructive/20">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              抹消を確定する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
