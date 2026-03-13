
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ExternalLink, AlertTriangle, Pencil, Users, ArrowLeft, Calendar, Clock, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { AdForm } from "./ad-form";
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
import { Badge } from "@/components/ui/badge";

export function AdManager() {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [adToDelete, setAdToDelete] = useState<any>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const adsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "ads");
  }, [firestore, user]);

  const { data: ads, isLoading } = useCollection(adsQuery);

  const handleUnlock = () => {
    if (pin === "1950") {
      setIsUnlocked(true);
    } else {
      toast({ variant: "destructive", title: "PINコードが違います" });
    }
  };

  const confirmDelete = () => {
    if (!adToDelete || !firestore) return;
    const docRef = doc(firestore, "ads", adToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました", description: `「${adToDelete.title}」を削除しました。` });
    setAdToDelete(null);
    setSelectedAd(null);
  };

  if (!isUnlocked) {
    return (
      <Card className="max-w-md mx-auto mt-20 shadow-xl">
        <CardHeader className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>広告管理ロック</CardTitle>
          <CardDescription>4桁の暗証番号を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            type="password" 
            placeholder="****" 
            className="text-center text-2xl tracking-[1em]"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <Button className="w-full h-12 font-bold" onClick={handleUnlock}>認証</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 詳細管理画面
  if (selectedAd) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedAd(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">広告を管理</h2>
            <p className="text-sm text-slate-500">「{selectedAd.title}」の設定と統計</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                基本設定
              </CardTitle>
              <CardDescription>広告のバナー画像、リンク、表示期間を編集します。</CardDescription>
            </CardHeader>
            <CardContent>
              <AdForm ad={selectedAd} onSuccess={() => setSelectedAd(null)} onCancel={() => setSelectedAd(null)} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  閲覧統計
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg text-center">
                  <p className="text-xs text-slate-500 font-medium">累計閲覧数</p>
                  <p className="text-4xl font-bold text-primary">{(selectedAd.clickCount || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    開始: {selectedAd.startDate ? new Date(selectedAd.startDate).toLocaleString("ja-JP") : "未設定"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    終了: {selectedAd.endDate ? new Date(selectedAd.endDate).toLocaleString("ja-JP") : "無期限"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-destructive/20 border-2">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  危険な操作
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full" onClick={() => setAdToDelete(selectedAd)}>
                  この広告を完全に削除
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <AlertDialog open={!!adToDelete} onOpenChange={(open) => !open && setAdToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{selectedAd.title}」のデータと累計閲覧数もすべて削除されます。
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

  // 広告作成画面
  if (isAdding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setIsAdding(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">新しい広告を追加</h2>
        </div>
        <Card className="max-w-2xl shadow-sm">
          <CardContent className="pt-6">
            <AdForm onSuccess={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">スポンサー広告管理</h2>
          <p className="text-sm text-slate-500">バナーをクリックして詳細設定や閲覧数を確認します。</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          広告を追加
        </Button>
      </div>

      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {ads.map((ad) => (
            <Card 
              key={ad.id} 
              className="overflow-hidden group cursor-pointer border-slate-200 shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
              onClick={() => setSelectedAd(ad)}
            >
              <div className="relative h-32 bg-slate-100 border-b">
                <Image 
                  src={ad.imageUrl} 
                  alt={ad.title || "広告バナー"} 
                  fill 
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, 300px"
                  unoptimized
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="bg-white/90 shadow-sm font-bold">
                    <Users className="h-3 w-3 mr-1" /> {(ad.clickCount || 0).toLocaleString()}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="truncate">
                    <p className="font-bold truncate text-slate-800">{ad.title || "無題の広告"}</p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center mt-1">
                      <ExternalLink className="h-2.5 w-2.5 mr-1" /> {ad.linkUrl}
                    </p>
                  </div>
                  <div className="bg-primary/10 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed rounded-xl text-slate-400 bg-white">
          <p className="font-bold">登録されている広告はありません</p>
          <p className="text-xs mt-1">「広告を追加」ボタンから新しいスポンサーリンクを登録してください。</p>
        </div>
      )}
    </div>
  );
}
