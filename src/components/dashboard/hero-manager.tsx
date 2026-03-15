"use client";

import { useState, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser, useFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, AlertTriangle, ImageIcon, X, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export function HeroManager() {
  const [isUploading, setIsUploading] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();

  const heroQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "hero-images");
  }, [firestore, user]);

  const { data: heroImages, isLoading } = useCollection(heroQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !firebaseApp) return;

    if (heroImages && heroImages.length >= 5) {
      toast({ variant: "destructive", title: "上限に達しています", description: "ヒーロー画像は5枚までです。" });
      return;
    }

    setIsUploading(true);
    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `hero/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const colRef = collection(firestore, "hero-images");
      addDocumentNonBlocking(colRef, {
        imageUrl: url,
        title: "スライド画像",
        order: (heroImages?.length || 0) + 1
      });
      
      toast({ title: "画像を追加しました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "アップロード失敗", description: error.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmDelete = () => {
    if (!imageToDelete || !firestore) return;
    const docRef = doc(firestore, "hero-images", imageToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました" });
    setImageToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ヒーロー画像管理</h2>
          <p className="text-sm text-slate-500">スライドショーに表示されるメイン画像。最大5枚。</p>
        </div>
        <div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-2 h-11 px-6 shadow-md font-black"
            disabled={isUploading || (heroImages && heroImages.length >= 5)}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            画像を選んで追加 ({heroImages?.length || 0}/5)
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heroImages?.map((image) => (
            <Card key={image.id} className="overflow-hidden group border-slate-200 shadow-sm rounded-2xl">
              <div className="relative h-48 bg-slate-100">
                <Image 
                  src={image.imageUrl} 
                  alt={image.title || "背景画像"} 
                  fill 
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 bg-white">
                <div className="flex items-center gap-2 text-slate-400">
                  <ImageIcon className="h-4 w-4 opacity-50" />
                  <p className="text-[10px] font-bold truncate">{image.imageUrl}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {heroImages?.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center border-4 border-dashed rounded-[2rem] text-slate-300 bg-white">
              <ImageIcon className="h-10 w-10 mx-auto opacity-20 mb-2" />
              <p className="font-bold">画像がありません</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="font-black">画像を削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-bold">
              この画像をスライドから取り除きます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl">削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
