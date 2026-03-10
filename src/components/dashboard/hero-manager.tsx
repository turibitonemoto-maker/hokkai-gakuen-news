
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export function HeroManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const heroQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "hero-images");
  }, [firestore]);

  const { data: heroImages, isLoading } = useCollection(heroQuery);

  const handleAdd = () => {
    const url = prompt("画像のURLを入力してください:");
    if (url && firestore) {
      const colRef = collection(firestore, "hero-images");
      addDocumentNonBlocking(colRef, {
        imageUrl: url,
        title: "新しい背景",
        order: (heroImages?.length || 0) + 1
      });
      toast({
        title: "追加しました",
        description: "ヒーロー画像を追加しました。",
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("この画像を削除しますか？") && firestore) {
      const docRef = doc(firestore, "hero-images", id);
      deleteDocumentNonBlocking(docRef);
      toast({
        title: "削除しました",
        description: "ヒーロー画像を削除しました。",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">ヒーロー画像管理</h2>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          画像を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heroImages?.map((image) => (
            <Card key={image.id} className="overflow-hidden group">
              <div className="relative h-48 bg-slate-200">
                <Image 
                  src={image.imageUrl} 
                  alt={image.title || "背景画像"} 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(image.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="font-medium truncate">{image.title || "無題の画像"}</p>
              </CardContent>
            </Card>
          ))}
          {heroImages?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-slate-400">
              画像がありません。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
