
"use client";

import { useState, useRef } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, AlertTriangle, Image as ImageLucide, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export function HeroManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const heroQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "hero-images");
  }, [firestore, user]);

  const { data: heroImages, isLoading } = useCollection(heroQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    if (heroImages && heroImages.length >= 5) {
      toast({ variant: "destructive", title: "上限", description: "最大5枚までです。" });
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        const colRef = collection(firestore, "hero-images");
        addDocumentNonBlocking(colRef, {
          imageUrl: base64,
          title: "スライド画像",
          order: (heroImages?.length || 0) + 1
        });
        toast({ title: "画像を取り込みました（Base64）" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
      setIsProcessing(false);
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
          <h2 className="text-2xl font-black text-slate-800">ヒーロー画像管制</h2>
          <p className="text-sm font-bold text-slate-500">スライドショーの背景（Base64埋め込み）。最大5枚。</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-2 h-12 px-8 shadow-lg font-black rounded-2xl"
            disabled={isProcessing || (heroImages && heroImages.length >= 5)}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            画像を選択 ({heroImages?.length || 0}/5)
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heroImages?.map((image) => (
            <Card key={image.id} className="overflow-hidden group border-slate-200 shadow-sm rounded-[2rem]">
              <div className="relative h-48 bg-slate-100">
                <Image 
                  src={image.imageUrl} 
                  alt="" 
                  fill 
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                  sizes="33vw"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image)} className="rounded-full">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 bg-white">
                <div className="flex items-center gap-2 text-slate-300">
                  <ImageLucide className="h-3 w-3" />
                  <p className="text-[8px] font-bold truncate">Base64 Encoded Data</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
