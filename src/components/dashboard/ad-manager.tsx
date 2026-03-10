"use client";

import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ExternalLink, AlertTriangle, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { AdForm } from "./ad-form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [adToDelete, setAdToDelete] = useState<any>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const adsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "ads");
  }, [firestore]);

  const { data: ads, isLoading } = useCollection(adsQuery);

  const handleAdd = () => {
    setCurrentAd(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (ad: any) => {
    setCurrentAd(ad);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!adToDelete || !firestore) return;
    
    const docRef = doc(firestore, "ads", adToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "広告を削除しました",
      description: `「${adToDelete.title}」を削除しました。`,
    });
    
    setAdToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">広告バナー管理</h2>
        <Button onClick={handleAdd} className="flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          広告を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads?.map((ad) => (
            <Card key={ad.id} className="overflow-hidden group border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-32 bg-slate-100 border-b">
                <Image 
                  src={ad.imageUrl} 
                  alt={ad.title || "広告バナー"} 
                  fill 
                  className="object-contain p-2"
                />
              </div>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="truncate mr-4">
                  <p className="font-semibold truncate text-slate-800">{ad.title || "無題の広告"}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center mt-1">
                    <ExternalLink className="h-3 w-3 mr-1" /> {ad.linkUrl}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-500 hover:text-primary hover:bg-primary/10" 
                    onClick={() => handleEdit(ad)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10" 
                    onClick={() => setAdToDelete(ad)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {ads?.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-slate-400 bg-white">
              <p className="text-lg font-medium">登録されている広告はありません</p>
              <p className="text-sm">右上の「広告を追加」から登録を開始してください</p>
            </div>
          )}
        </div>
      )}

      {/* 登録・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentAd ? "広告を編集" : "新しい広告を追加"}</DialogTitle>
            <DialogDescription>
              バナー画像と遷移先のリンクを入力してください。
            </DialogDescription>
          </DialogHeader>
          <AdForm ad={currentAd} onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!adToDelete} onOpenChange={(open) => !open && setAdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>広告を削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              広告「<span className="font-bold text-slate-900">{adToDelete?.title}</span>」を削除します。この操作は取り消せません。
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
