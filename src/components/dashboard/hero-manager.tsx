"use client";

import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, AlertTriangle, ImageIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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

export function HeroManager() {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [imageToDelete, setImageToDelete] = useState<any>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const heroQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "hero-images");
  }, [firestore, user]);

  const { data: heroImages, isLoading } = useCollection(heroQuery);

  const handleAdd = () => {
    if (!newUrl) return;
    if (heroImages && heroImages.length >= 5) {
      toast({
        variant: "destructive",
        title: "追加できません",
        description: "ヒーロー画像は最大5枚までです。",
      });
      return;
    }

    if (firestore) {
      const colRef = collection(firestore, "hero-images");
      addDocumentNonBlocking(colRef, {
        imageUrl: newUrl,
        title: "スライド画像",
        order: (heroImages?.length || 0) + 1
      });
      toast({
        title: "画像を追加しました",
        description: "ヒーロー画像を追加しました。",
      });
      setNewUrl("");
      setIsAdding(false);
    }
  };

  const confirmDelete = () => {
    if (!imageToDelete || !firestore) return;
    const docRef = doc(firestore, "hero-images", imageToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました", description: "画像を削除しました。" });
    setImageToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ヒーロー画像管理</h2>
          <p className="text-sm text-slate-500">最大5枚まで設定可能。一定間隔で自動的に切り替わります。</p>
        </div>
        {!isAdding ? (
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-11 px-6 shadow-md" disabled={heroImages && heroImages.length >= 5}>
            <Plus className="h-4 w-4" />
            画像を追加 ({heroImages?.length || 0}/5)
          </Button>
        ) : (
          <div className="flex gap-2 w-full max-w-md animate-in slide-in-from-right-4 duration-300">
            <Input 
              placeholder="画像のURLを入力" 
              value={newUrl} 
              onChange={(e) => setNewUrl(e.target.value)} 
              className="bg-white"
            />
            <Button onClick={handleAdd} className="font-bold">追加</Button>
            <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heroImages?.map((image) => (
            <Card key={image.id} className="overflow-hidden group border-slate-200 shadow-sm">
              <div className="relative h-48 bg-slate-100">
                <Image 
                  src={image.imageUrl} 
                  alt={image.title || "背景画像"} 
                  fill 
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 bg-white">
                <div className="flex items-center gap-2 text-slate-600">
                  <ImageIcon className="h-4 w-4 opacity-50" />
                  <p className="text-xs font-bold truncate">{image.imageUrl}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {heroImages?.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-slate-400 bg-white">
              <ImageIcon className="h-10 w-10 mx-auto opacity-20 mb-2" />
              <p className="font-bold">登録されている画像はありません</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>画像を削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              この画像をスライドから削除します。この操作は取り消せません。
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
