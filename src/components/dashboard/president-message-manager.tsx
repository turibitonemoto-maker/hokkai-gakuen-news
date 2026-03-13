
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User as UserIcon, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

const presidentMessageSchema = z.object({
  authorName: z.string().min(1, "会長の氏名を入力してください"),
  authorImageUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  content: z.string().min(1, "挨拶の本文を入力してください"),
});

type PresidentMessageValues = z.infer<typeof presidentMessageSchema>;

export function PresidentMessageManager() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "president-message");
  }, [firestore, user]);

  const { data: messageData, isLoading } = useDoc(docRef);

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

  const form = useForm<PresidentMessageValues>({
    resolver: zodResolver(presidentMessageSchema),
    defaultValues: {
      authorName: "",
      authorImageUrl: "",
      content: "",
    },
  });

  useEffect(() => {
    if (messageData) {
      form.reset({
        authorName: messageData.authorName || "",
        authorImageUrl: messageData.authorImageUrl || "",
        content: messageData.content || "",
      });
    }
  }, [messageData, form]);

  const handleUnlock = () => {
    if (lockoutTime && lockoutTime > Date.now()) return;

    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true);
      setFailCount(0);
      toast({ title: "アクセス承認", description: "編集権限を確認しました。" });
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) {
        const until = Date.now() + 5 * 60 * 1000;
        setLockoutTime(until);
        localStorage.setItem("lockout_until", until.toString());
        toast({ variant: "destructive", title: "アクセス拒否", description: "頭を冷やしてください。" });
      } else {
        toast({ variant: "destructive", title: "パスワード不一致", description: `あと ${3 - newCount} 回でロックされます。` });
      }
    }
  };

  function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef) return;

    setDocumentNonBlocking(docRef, {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "更新しました",
      description: "会長挨拶の内容を保存しました。",
    });
  }

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-4xl mx-auto mt-10 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-black text-white rounded-[3rem] overflow-hidden text-center p-0">
          <div className="relative aspect-video w-full bg-slate-900">
            <iframe 
              src="https://drive.google.com/file/d/1Exd3NJVJ4KeS5PNI9IgZJEDsWgvjshBJ/preview" 
              className="absolute inset-0 w-full h-full border-none"
              allow="autoplay"
              title="Trap Video"
            ></iframe>
          </div>
          <div className="p-12 space-y-6">
            <h2 className="text-3xl font-black mb-4 text-red-500">アクセス禁止 🔒</h2>
            <p className="text-slate-400 font-bold text-lg">頭を冷やして出直してください。<br />再試行まであと約 {Math.ceil((lockoutTime - Date.now()) / 60000)} 分です。</p>
            <Button variant="outline" className="border-slate-700 text-slate-400 h-12 px-8 rounded-2xl" onClick={() => window.location.reload()}>
              システム再起動
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">会長挨拶 🔒</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">
              このセクションを編集するにはアクセス承認が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">承認パスワード</label>
              <Input 
                type="password" 
                placeholder="パスワードを入力" 
                className="text-center h-14 text-lg font-bold rounded-2xl border-slate-200 shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
            </div>
            <Button className="w-full h-14 font-black text-md rounded-2xl shadow-lg hover:scale-[1.02] transition-transform" onClick={handleUnlock}>
              アクセスを承認する
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶 🔒</h2>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <UserIcon className="h-6 w-6 text-primary" />
            メッセージの編集
          </CardTitle>
          <CardDescription className="text-sm font-bold text-slate-500 mt-1">
            公式サイトのトップページに表示される「会長の言葉」を編集します。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-600">会長氏名</FormLabel>
                      <FormControl>
                        <Input placeholder="例：北海 太郎" className="h-12 font-bold rounded-xl border-slate-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-600">顔写真URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/photo.jpg" className="h-12 font-bold rounded-xl border-slate-200" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px] font-bold">
                        正方形（1:1）の画像を推奨します。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bold text-slate-600">挨拶の本文</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="新入生の皆さんへ..." 
                          className="min-h-[400px] text-lg leading-relaxed p-8 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white transition-colors shadow-inner" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs font-bold text-primary/60">
                        ※ 改行は公式サイトでもそのまま反映されます。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-8 border-t border-slate-100">
                <Button type="submit" className="flex items-center gap-3 px-12 h-14 font-black rounded-2xl shadow-xl shadow-primary/10 hover:scale-105 transition-transform">
                  <Save className="h-5 w-5" />
                  保存して更新する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
