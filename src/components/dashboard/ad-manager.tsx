
"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ExternalLink, AlertTriangle, Pencil, Users, ArrowLeft, Lock, Megaphone, ShieldAlert } from "lucide-react";
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
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [adToDelete, setAdToDelete] = useState<any>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const storedLockout = localStorage.getItem("lockout_until");
    if (storedLockout) {
      const until = parseInt(storedLockout);
      if (until > Date.now()) {
        setLockoutTime(until);
      } else {
        localStorage.removeItem("lockout_until");
      }
    }
  }, []);

  const adsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "ads");
  }, [firestore, user]);

  const { data: ads, isLoading } = useCollection(adsQuery);

  const handleUnlock = () => {
    if (lockoutTime && lockoutTime > Date.now()) return;
    const correctPassword = "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true);
      setFailCount(0);
      toast({ title: "認証完了" });
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) {
        setIsVerifying(true);
        setTimeout(() => {
          setIsVerifying(false);
          const until = Date.now() + 15 * 60 * 1000;
          setLockoutTime(until);
          localStorage.setItem("lockout_until", until.toString());
          toast({ variant: "destructive", title: "アクセス拒否" });
        }, 800);
      } else {
        toast({ variant: "destructive", title: "不一致" });
      }
    }
  };

  const confirmDelete = () => {
    if (!adToDelete || !firestore) return;
    const docRef = doc(firestore, "ads", adToDelete.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "削除しました" });
    setAdToDelete(null);
    setSelectedAd(null);
  };

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-slate-400">照合中...</p></div>;
  if (lockoutTime && lockoutTime > Date.now()) return <div className="max-w-4xl mx-auto mt-10"><Card className="shadow-2xl rounded-[3rem] p-16 text-center space-y-8"><div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto"><ShieldAlert className="h-12 w-12 text-red-500" /></div><h2 className="text-3xl font-black text-slate-800">セキュリティ・ロック</h2><p className="text-slate-500 font-bold">一時的に制限しています。</p></Card></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">広告管理</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">編集には認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSCODE</label>
              <Input type="password" placeholder="パスワードを入力してください" className="text-center h-14 text-lg font-bold rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} autoFocus />
            </div>
            <Button className="w-full h-14 font-black rounded-2xl" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (selectedAd) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedAd(null)} className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">広告を編集</h2>
            <p className="text-sm font-bold text-slate-500">「{selectedAd.title}」</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-lg font-black flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" />基本設定</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <AdForm ad={selectedAd} onSuccess={() => setSelectedAd(null)} onCancel={() => setSelectedAd(null)} />
            </CardContent>
          </Card>
          <div className="space-y-8">
            <Card className="shadow-sm border-slate-200 rounded-3xl bg-white">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Users className="h-5 w-5 text-primary" />閲覧統計</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="bg-primary/5 p-8 rounded-3xl text-center border border-primary/10 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">累計クリック数</p>
                  <p className="text-5xl font-black text-primary">{(selectedAd.clickCount || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-destructive/20 border-2 rounded-3xl bg-destructive/5 overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />危険な操作</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button variant="destructive" className="w-full h-12 font-black rounded-xl shadow-lg" onClick={() => setAdToDelete(selectedAd)}>この広告を完全に削除</Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <AlertDialog open={!!adToDelete} onOpenChange={(open) => !open && setAdToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-none p-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black text-slate-800">本当に削除しますか？</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-bold text-slate-500 py-4">「{adToDelete?.title}」のデータを完全に削除します。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black h-12 px-8">削除を実行</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (isAdding) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setIsAdding(false)} className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">新しい広告を追加</h2>
        </div>
        <Card className="max-w-2xl shadow-sm border-slate-200 rounded-3xl bg-white p-8">
          <CardContent className="p-0"><AdForm onSuccess={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">広告管理</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">広告バナーの掲載期間やクリック統計を管理します。</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 h-12 px-8 font-black rounded-2xl shadow-lg">
          <Plus className="h-5 w-5" />
          広告を追加
        </Button>
      </div>
      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden group cursor-pointer border-slate-200 shadow-sm hover:shadow-xl transition-all rounded-3xl bg-white" onClick={() => setSelectedAd(ad)}>
              <div className="relative h-40 bg-slate-50 border-b overflow-hidden">
                <Image src={ad.imageUrl} alt={ad.title || ""} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                <div className="absolute top-4 right-4"><Badge variant="secondary" className="bg-white/95 font-black px-3 py-1 rounded-full shadow-md">{(ad.clickCount || 0).toLocaleString()} clicks</Badge></div>
              </div>
              <CardContent className="p-6">
                <p className="font-black text-slate-800 truncate text-lg group-hover:text-primary transition-colors">{ad.title || "無題の広告"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border-4 border-dashed rounded-[3rem] text-slate-300 bg-white">
          <Megaphone className="h-16 w-16 mx-auto opacity-10 mb-4" />
          <p className="text-xl font-black">広告データがありません</p>
        </div>
      )}
    </div>
  );
}
