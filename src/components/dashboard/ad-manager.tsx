"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";

export function AdManager() {
  const firestore = useFirestore();

  const adsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "ads");
  }, [firestore]);

  const { data: ads, isLoading } = useCollection(adsQuery);

  const handleAdd = () => {
    const title = prompt("広告名を入力:");
    const imageUrl = prompt("バナー画像URLを入力:");
    const linkUrl = prompt("遷移先リンクURLを入力:");
    
    if (title && imageUrl && linkUrl && firestore) {
      const colRef = collection(firestore, "ads");
      addDocumentNonBlocking(colRef, { title, imageUrl, linkUrl });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("この広告を削除しますか？") && firestore) {
      const docRef = doc(firestore, "ads", id);
      deleteDocumentNonBlocking(docRef);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">広告バナー管理</h2>
        <Button onClick={handleAdd} className="flex items-center gap-2">
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
            <Card key={ad.id} className="overflow-hidden group">
              <div className="relative h-32 bg-slate-100">
                <Image 
                  src={ad.imageUrl} 
                  alt={ad.title || "広告バナー"} 
                  fill 
                  className="object-contain p-2"
                />
              </div>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="truncate mr-4">
                  <p className="font-medium truncate">{ad.title || "無題の広告"}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center">
                    <ExternalLink className="h-3 w-3 mr-1" /> {ad.linkUrl}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ad.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {ads?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-slate-400">
              登録されている広告はありません。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
