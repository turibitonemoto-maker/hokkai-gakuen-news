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
  Lock,
  ArrowRight
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
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";

export function NoteManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rssArticles, setRssArticles] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
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
      toast({ variant: "destructive", title: "ロック中", description: "頭を冷やしてください。" });
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

        toast({ title: "同期完了", description: "最新のnote記事を取得しました。記事管理で公開設定を行えます。" });
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
        setIsVerifying(true);
        setTimeout(() => {
          setIsVerifying(false);
          const until = Date.now() + 5 * 60 * 1000;
          setLockoutTime(until);
          localStorage.setItem("lockout_until", until.toString());
          setShowPasswordDialog(false);
          toast({ variant: "destructive", title: "アクセス拒否", description: "頭を冷やしてください。" });
        }, 800);
      } else {
        toast({ variant: "destructive", title: "不一致", description: `あと ${3 - newCount} 回でロックされます。` });
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
      title: "記事管理へ送りました", 
      description: `「${article.title}」を下書きとして採用しました。記事管理ページで公開してください。` 
    });
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black text-slate-400 animate-pulse">確認中...</p>
      </div>
    );
  }

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-4xl mx-auto mt-10 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-black text-white rounded-[2rem] md:rounded-[3rem] overflow-hidden text-center p-0">
          <div className="relative aspect-video w-full bg-slate-900">
            <iframe 
              src="https://drive.google.com/file/d/1Exd3NJVJ4KeS5PNI9IgZJEDsWgvjshBJ/preview" 
              className="absolute inset-0 w-full h-full border-none"
              title="Trap Video"
            ></iframe>
          </div>
          <div className="p-8 md:p-12 space-y-6">
            <h2 className="text-2xl md:text-3xl font-black mb-4 text-red-500">アクセス禁止 🔒</h2>
            <p className="text-slate-400 font-bold text-sm md:text-lg">頭を冷やして出直してください。<br />再試行まであと約 {Math.ceil((lockoutTime - Date.now()) / 60000)} 分です。</p>
            <Button variant="outline" className="border-slate-700 text-slate-400 h-12 px-8 rounded-2xl" onClick={() => window.location.reload()}>
              システム再起動
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">note管理</h2>
          <p className="text-sm font-bold text-slate-500">外部メディア（note）からの記事取得を管理します。</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Link href="/admin/articles">
            <Button variant="ghost" className="w-full md:w-auto gap-2 font-bold h-12 rounded-2xl">
              記事管理へ移動
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={startSyncProcess} 
            disabled={isSyncing}
            className="w-full md:w-auto gap-3 border-purple-200 text-purple-700 hover:bg-purple-50 font-black h-12 px-8 rounded-2xl shadow-sm"
          >
            <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
            noteから最新記事を取得 🔒
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white rounded-2xl md:rounded-[2rem]">
        <CardHeader className="bg-purple-50/50 border-b p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg md:text-xl flex items-center gap-3 text-purple-800 font-black">
              <Share2 className="h-6 w-6" />
              note 投稿同期ハブ
            </CardTitle>
            <CardDescription className="text-xs md:text-sm font-bold text-purple-600/70">
              lucky_minnow287 (北海学園大学一部新聞会) の全データを捕捉します。
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <CardContent className="p-0">
            {isSyncing || (isDbLoading && rssArticles.length === 0) ? (
              <div className="py-24 flex flex-col items-center gap-6">
                <div className="bg-purple-50 p-6 rounded-full animate-pulse">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                </div>
                <p className="text-sm text-slate-400 font-black uppercase tracking-widest text-center px-6">noteサーバーから情報を解析中...</p>
              </div>
            ) : rssArticles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="px-6 md:px-8 h-14 font-black text-slate-400 text-xs uppercase tracking-widest">記事情報・プレビュー</TableHead>
                    <TableHead className="h-14 font-black text-slate-400 text-xs uppercase tracking-widest">公開日</TableHead>
                    <TableHead className="text-right px-6 md:px-8 h-14 font-black text-slate-400 text-xs uppercase tracking-widest">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rssArticles.map((article) => {
                    const isImported = dbNoteIds.has(article.id);
                    return (
                      <TableRow key={article.id} className="group hover:bg-purple-50/30 transition-colors">
                        <TableCell className="px-6 md:px-8 py-4 md:py-5">
                          <div className="flex gap-4 md:gap-5 items-center">
                            <div className="relative h-12 w-20 md:h-14 md:w-24 rounded-xl md:rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-slate-100 flex-shrink-0">
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
                                <ImageOff className="h-4 w-4 md:h-5 md:w-5 m-auto opacity-20" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-slate-800 truncate text-sm md:text-base leading-tight group-hover:text-purple-700 transition-colors">{article.title}</span>
                              <a href={article.noteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-500 hover:underline flex items-center gap-1.5 mt-2 font-black uppercase tracking-tight">
                                <ExternalLink className="h-3 w-3" /> note原文をみる
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-slate-500 font-black font-mono whitespace-nowrap">
                          {article.publishDate}
                        </TableCell>
                        <TableCell className="text-right px-6 md:px-8">
                          {isImported ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-8 md:h-9 px-3 md:px-4 font-black rounded-xl text-[10px]">インポート済み</Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleImport(article)} className="h-8 md:h-9 gap-2 font-black bg-white text-purple-600 border-2 border-purple-100 hover:bg-purple-50 hover:border-purple-300 shadow-sm rounded-xl px-3 md:px-5 text-[10px]">
                              <PlusCircle className="h-3 w-3 md:h-4 md:w-4" />
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
              <div className="py-24 md:py-32 text-center text-slate-300">
                <div className="bg-slate-50 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Share2 className="h-8 w-8 md:h-10 md:w-10 opacity-20" />
                </div>
                <p className="font-black text-base md:text-lg text-slate-400">同期ハブを起動してください</p>
                <p className="text-xs md:text-sm font-bold mt-2 opacity-60 px-6">右上のボタンから最新のnoteデータを一括取得し、記事管理へ送ることができます。</p>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="w-[90vw] max-w-md rounded-[2rem] border-none p-6 md:p-10">
          <DialogHeader className="space-y-4">
            <div className="bg-primary/10 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl md:text-2xl font-black text-slate-800 text-center">管制認証 🔒</DialogTitle>
            <DialogDescription className="text-center font-bold text-slate-500 text-sm">
              noteデータの同期には管理者権限が必要です。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 md:py-6 flex flex-col gap-2">
            <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">パスワード</label>
            <Input 
              type="password" 
              placeholder="" 
              className="text-center h-12 md:h-14 text-lg font-bold rounded-2xl border-slate-200 shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSyncWithAuth()}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col md:flex-row gap-3">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="w-full md:w-auto rounded-xl font-bold h-11 md:h-12">キャンセル</Button>
            <Button onClick={handleSyncWithAuth} className="w-full md:w-auto rounded-xl font-black h-11 md:h-12 shadow-lg shadow-primary/20">同期を開始</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
