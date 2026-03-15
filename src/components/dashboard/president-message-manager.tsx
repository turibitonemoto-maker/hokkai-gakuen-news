
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User as UserIcon, Lock, Bold, Italic, Heading2, List, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from "@/lib/utils";
import Image from "next/image";

const presidentMessageSchema = z.object({
  authorName: z.string().min(1, "会長の氏名を入力してください"),
  authorImageUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
});

type PresidentMessageValues = z.infer<typeof presidentMessageSchema>;

export function PresidentMessageManager() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "president_greeting");
  }, [firestore, user]);

  const { data: messageData, isLoading } = useDoc(docRef);

  const form = useForm<PresidentMessageValues>({
    resolver: zodResolver(presidentMessageSchema),
    defaultValues: {
      authorName: "",
      authorImageUrl: "",
    },
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px] p-8 prose-p:leading-7 prose-p:my-4',
      },
    },
  });

  useEffect(() => {
    if (messageData) {
      form.reset({
        authorName: messageData.authorName || "",
        authorImageUrl: messageData.authorImageUrl || "",
      });
      if (editor && messageData.content && editor.getHTML() !== messageData.content) {
        editor.commands.setContent(messageData.content);
      }
    }
  }, [messageData, form, editor]);

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

  const handleUnlock = () => {
    if (lockoutTime && lockoutTime > Date.now()) return;
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true);
      setFailCount(0);
      toast({ title: "認証完了", description: "編集権限を確認しました。" });
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
          toast({ variant: "destructive", title: "アクセス拒否", description: "頭を冷やしてください。" });
        }, 800);
      } else {
        toast({ variant: "destructive", title: "不一致", description: `あと ${3 - newCount} 回でロックされます。` });
      }
    }
  };

  async function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef || !editor) return;

    setIsSaving(true);
    try {
      const htmlContent = editor.getHTML();
      await setDoc(docRef, {
        authorName: values.authorName,
        authorImageUrl: values.authorImageUrl,
        content: htmlContent, // Sacred Scripture: Field is 'content'
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "更新しました", description: "会長挨拶を最新の形式で保存しました。" });
    } catch (error: any) {
      console.error("Save failed:", error);
      toast({ variant: "destructive", title: "保存エラー", description: "更新に失敗しました。" });
    } finally {
      setIsSaving(false);
    }
  }

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
        <Card className="shadow-2xl border-none bg-black text-white rounded-[3rem] overflow-hidden text-center p-0">
          <div className="relative aspect-video w-full bg-slate-900">
            <iframe src="https://drive.google.com/file/d/1Exd3NJVJ4KeS5PNI9IgZJEDsWgvjshBJ/preview" className="absolute inset-0 w-full h-full border-none" title="Trap Video" />
          </div>
          <div className="p-12 space-y-6">
            <h2 className="text-3xl font-black mb-4 text-red-500">アクセス禁止 🔒</h2>
            <p className="text-slate-400 font-bold text-lg">頭を冷やして出直してください。</p>
            <Button variant="outline" className="border-slate-700 text-slate-400 h-12 px-8 rounded-2xl" onClick={() => window.location.reload()}>システム再起動</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">会長挨拶 🔒</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="text-center h-14 text-lg font-bold rounded-2xl" autoFocus />
            </div>
            <Button className="w-full h-14 font-black text-md rounded-2xl" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-2xl shadow-md border-2 border-slate-50">
          <Image src="/icon.png" alt="" width={48} height={48} className="rounded-xl" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶 🔒</h2>
      </div>
      <Card className="shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-xl font-black flex items-center gap-3"><UserIcon className="h-6 w-6 text-primary" />メッセージの編集</CardTitle>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="authorName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会長氏名</FormLabel>
                    <FormControl><Input placeholder="" className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="authorImageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顔写真URL</FormLabel>
                    <FormControl><Input placeholder="" className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="md:col-span-2">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Type className="h-3 w-3" /> 挨拶本文 (リッチエディタ)
                  </FormLabel>
                  <div className="flex items-center gap-1 border-b pb-2 mb-2">
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bold') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('italic') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bulletList') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                  </div>
                  <div className="min-h-[300px] bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-8 border-t border-slate-100">
                <Button type="submit" disabled={isSaving} className="px-12 h-14 font-black rounded-2xl shadow-xl shadow-primary/10">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-3" />}
                  保存する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
