
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { 
  Share2, 
  Loader2, 
  ExternalLink, 
  PlusCircle, 
  ImageOff,
  RefreshCw,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { fetchNoteArticles } from "@/app/actions/sync-note";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rssArticles, setRssArticles] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  
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

  const noteArticlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "articles");
  }, [firestore, user]);

  const { data: allArticles, isLoading: isDbLoading } = useCollection(noteArticlesQuery);
  
  const syncLogRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "note-sync");
  }, [firestore, user]);

  const dbNoteIds = useMemo(() => {
    if (!allArticles) return new Set();
    return new Set(allArticles.filter(a => a.articleType === "Note").map(a => a.id));
  }, [allArticles]);

  const startSyncProcess = () => {
    if (lockoutTime && lockoutTime > Date.now()) {
      toast({ variant: "destructive", title: "ロック中", description: "頭を冷やして出直してください。" });
      return;
    }
    setShowPasswordDialog(true);
  };

  const handleSyncWithAuth = async () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
    if (password === correctPassword) {
      setShowPasswordDialog(false);
      setFailCount(0);
      setIsSyncing(true);
      try {
        const articles = await fetchNoteArticles();
        setRssArticles(articles);
        
        if (firestore && syncLogRef) {
          setDocumentNonBlocking(syncLogRef, {
            lastSyncAt: new Date().toISOString(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }

        toast({ title: "同期完了", description: "最新のnote記事を取得しました。" });
      } catch (e) {
        toast({ variant: "destructive", title: "同期エラー", description: "noteの取得に失敗しました。" });
      } finally {
        setIsSyncing(false);
        setPassword("");
      }
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) {
        const until = Date.now() + 5 * 60 * 1000;
        setLockoutTime(until);
        localStorage.setItem("lockout_until", until.toString());
        setShowPasswordDialog(false);
        toast({ variant: "destructive", title: "アクセス拒否", description: "残心が足りません。頭を冷やしてください。" });
      } else {
        toast({ variant: "destructive", title: "パスワード不一致", description: `あと ${3 - newCount} 回でロックされます。` });
      }
    }
  };

  const handleImport = (article: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, "articles", article.id);
    
    setDocumentNonBlocking(docRef, {
      ...article,
      isPublished: false,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || "unknown"
    }, { merge: true });

    toast({ 
      title: "採用しました", 
      description: `「${article.title}」を下書きとして追加しました。` 
    });
  };

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-xl mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-slate-900 text-white rounded-[3rem] overflow-hidden text-center p-12">
          <div className="relative h-64 w-full rounded-2xl overflow-hidden mb-8">
            <Image 
              src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJwamN4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxx66d7Y18Y/giphy.gif"
              alt="頭を冷やして"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <h2 className="text-2xl font-black mb-4">残心が足りません</h2>
          <p className="text-slate-400 font-bold mb-8">頭を冷やして出直してください。<br />再試行まであと約 {Math.ceil((lockoutTime - Date.now()) / 60000)} 分です。</p>
          <Button variant="outline" className="border-slate-700 text-slate-400" onClick={() => window.location.reload()}>
            再起動
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">note管理</h2>
          <p className="text-sm font-bold text-slate-500">外部メディア（note）との連携を管理します。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={startSyncProcess} 
          disabled={isSyncing}
          className="gap-3 border-purple-200 text-purple-700 hover:bg-purple-50 font-black h-12 px-8 rounded-2xl shadow-sm"
        >
          <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
          最新記事を更新 🔒
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white rounded-[2rem]">
        <CardHeader className="bg-purple-50/50 border-b p-8 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-3 text-purple-800 font-black">
              <Share2 className="h-6 w-6" />
              note 投稿一覧
            </CardTitle>
            <CardDescription className="text-sm font-bold text-purple-600/70">
              note.com の公式アカウントから取得した最新の投稿です。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isSyncing || (isDbLoading && rssArticles.length === 0) ? (
            <div className="py-24 flex flex-col items-center gap-6">
              <div className="bg-purple-50 p-6 rounded-full animate-pulse">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
              </div>
              <p className="text-sm text-slate-400 font-black uppercase tracking-widest">データを同期しています...</p>
            </div>
          ) : rssArticles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="px-8 h-14 font-black text-slate-400 text-xs uppercase tracking-widest">記事情報</TableHead>
                  <TableHead className="h-14 font-black text-slate-400 text-xs uppercase tracking-widest">公開日</TableHead>
                  <TableHead className="text-right px-8 h-14 font-black text-slate-400 text-xs uppercase tracking-widest">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rssArticles.map((article) => {
                  const isImported = dbNoteIds.has(article.id);
                  return (
                    <TableRow key={article.id} className="group hover:bg-purple-50/30 transition-colors">
                      <TableCell className="px-8 py-5">
                        <div className="flex gap-5 items-center">
                          <div className="relative h-14 w-24 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-slate-100 flex-shrink-0">
                            {article.mainImageUrl ? (
                              <Image 
                                src={article.mainImageUrl} 
                                alt="" 
                                fill 
                                className="object-cover transition-transform group-hover:scale-110" 
                                unoptimized 
                                sizes="96px"
                              />
                            ) : (
                              <ImageOff className="h-5 w-5 m-auto opacity-20" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-800 truncate text-base leading-tight group-hover:text-purple-700 transition-colors">{article.title}</span>
                            <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-500 hover:underline flex items-center gap-1.5 mt-2 font-black uppercase tracking-tight">
                              <ExternalLink className="h-3 w-3" /> noteで原文を読む
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-black font-mono">
                        {article.publishDate}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        {isImported ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-9 px-4 font-black rounded-xl">採用済み</Badge>
                        ) : (
                          <Button size="sm" onClick={() => handleImport(article)} className="h-9 gap-2 font-black bg-white text-purple-600 border-2 border-purple-100 hover:bg-purple-50 hover:border-purple-300 shadow-sm rounded-xl px-5">
                            <PlusCircle className="h-4 w-4" />
                            採用する
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-32 text-center text-slate-300">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Share2 className="h-10 w-10 opacity-20" />
              </div>
              <p className="font-black text-lg text-slate-400">最新記事を更新してください</p>
              <p className="text-sm font-bold mt-2 opacity-60">右上の更新ボタンから note.com の最新データを取得します。</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none p-10">
          <DialogHeader className="space-y-4">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 text-center">アクセス承認 🔒</DialogTitle>
            <DialogDescription className="text-center font-bold text-slate-500">
              伝統を保護するためのアクセス承認が必要です。
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input 
              type="password" 
              placeholder="●●●●●●" 
              className="text-center h-14 text-lg font-bold rounded-2xl border-slate-200 shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSyncWithAuth()}
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-center gap-3">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-xl font-bold h-12 px-6">キャンセル</Button>
            <Button onClick={handleSyncWithAuth} className="rounded-xl font-black h-12 px-10 shadow-lg shadow-primary/20">更新を実行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
