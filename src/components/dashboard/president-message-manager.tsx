
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Loader2, Save, Bold, Italic, Heading2, List, Maximize, User, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from "@/lib/utils";
import Image from "next/image";

const presidentMessageSchema = z.object({
  title: z.string().min(1, "見出しを入力してください"),
  authorName: z.string().min(1, "氏名を入力してください"),
  authorImageUrl: z.string().optional().or(z.literal("")),
  authorImageTransform: z.object({
    scale: z.number().default(0),
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ scale: 0, x: 0, y: 0 }),
});

type PresidentMessageValues = z.infer<typeof presidentMessageSchema>;

export function PresidentMessageManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [authorImageFile, setAuthorImageFile] = useState<File | null>(null);
  const [authorImagePreview, setAuthorImagePreview] = useState<string>("");
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const storedLockout = localStorage.getItem("lockout_until");
    if (storedLockout) {
      const until = parseInt(storedLockout);
      if (until > Date.now()) setLockoutTime(until);
      else localStorage.removeItem("lockout_until");
    }
  }, []);

  const handleUnlock = () => {
    if (lockoutTime && lockoutTime > Date.now()) return;
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
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
        toast({ variant: "destructive", title: "不一致", description: `あと ${3 - newCount} 回でロックされます。` });
      }
    }
  };

  const docRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "president_greeting");
  }, [firestore, user]);

  const { data: messageData, isLoading } = useDoc(docRef);

  const form = useForm<PresidentMessageValues>({
    resolver: zodResolver(presidentMessageSchema),
    defaultValues: {
      title: "",
      authorName: "",
      authorImageUrl: "",
      authorImageTransform: { scale: 0, x: 0, y: 0 },
    },
  });

  const transform = form.watch("authorImageTransform");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[300px] p-8 text-lg leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (messageData) {
      form.reset({
        title: messageData.title || "",
        authorName: messageData.authorName || "",
        authorImageUrl: messageData.authorImageUrl || "",
        authorImageTransform: messageData.authorImageTransform || { scale: 0, x: 0, y: 0 },
      });
      if (messageData.authorImageUrl) setAuthorImagePreview(messageData.authorImageUrl);
      if (editor && messageData.content && editor.getHTML() !== messageData.content) {
        editor.commands.setContent(messageData.content);
      }
    }
  }, [messageData, form, editor]);

  const handleFacePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const blobUrl = URL.createObjectURL(file);
    setAuthorImageFile(file);
    setAuthorImagePreview(blobUrl);
    form.setValue("authorImageTransform", { scale: 0, x: 0, y: 0 });
    if (e.target) e.target.value = "";
  };

  async function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef || !editor) return;
    setIsSaving(true);
    try {
      let finalImageUrl = values.authorImageUrl;
      if (authorImageFile) {
        const formData = new FormData();
        formData.append("file", authorImageFile);
        formData.append("folder", "会長挨拶写真");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("アップロードに失敗しました");
        const data = await res.json();
        finalImageUrl = data.secure_url;
      }
      const dataToSave = {
        ...values,
        authorImageUrl: finalImageUrl,
        content: editor.getHTML(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      };
      setDocumentNonBlocking(docRef, dataToSave, { merge: true });
      toast({ title: "保存しました" });
      setAuthorImageFile(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-slate-400">認証情報を照合中...</p></div>;
  if (lockoutTime && lockoutTime > Date.now()) return <div className="max-w-4xl mx-auto mt-10"><Card className="shadow-2xl rounded-[3rem] p-16 text-center space-y-8"><div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto"><ShieldAlert className="h-12 w-12 text-red-500" /></div><h2 className="text-3xl font-black text-slate-800">セキュリティ・ロック 🔒</h2><p className="text-slate-500 font-bold">一時的にこの機能を制限しています。約 {Math.ceil((lockoutTime - Date.now()) / 60000)} 分後にお試しください。</p></Card></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">会長挨拶管理 🔒</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">この重要区画を編集するには認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSCODE</label>
              <Input type="password" className="text-center h-14 text-lg font-bold rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} autoFocus />
            </div>
            <Button className="w-full h-14 font-black rounded-2xl" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶管理 🔒</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">会長のプロフィールとメッセージを管理します。</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoSelect} />
          <div className="relative w-48 h-48 rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-50 cursor-pointer hover:scale-105 transition-all flex items-center justify-center group" onClick={() => fileInputRef.current?.click()}>
            {authorImagePreview ? <Image src={authorImagePreview} alt="" fill style={{ objectFit: "contain", transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})` }} unoptimized /> : <User className="h-12 w-12 text-slate-200" />}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center"><span className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black text-primary shadow-lg">写真を変更</span></div>
          </div>
        </div>

        {authorImagePreview && (
          <div className="w-full max-w-xl bg-white/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2"><Maximize className="h-3 w-3 text-primary" /> 写真の調整</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3"><label className="text-[9px] font-bold text-slate-500 block text-center">ズーム</label><Slider min={-200} max={500} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("authorImageTransform.scale", val)} /></div>
              <div className="space-y-3"><label className="text-[9px] font-bold text-slate-500 block text-center">水平位置</label><Slider min={-500} max={500} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("authorImageTransform.x", val)} /></div>
              <div className="space-y-3"><label className="text-[9px] font-bold text-slate-500 block text-center">垂直位置</label><Slider min={-500} max={500} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("authorImageTransform.y", val)} /></div>
            </div>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-8 space-y-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">見出し</FormLabel><FormControl><Input className="h-14 font-bold rounded-2xl bg-slate-50/50" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="authorName" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">氏名</FormLabel><FormControl><Input className="h-14 font-bold rounded-2xl bg-slate-50/50" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メッセージ内容</label>
                <div className="border-2 border-slate-100 rounded-[3rem] overflow-hidden bg-white">
                  <div className="flex items-center gap-1 bg-slate-50/50 p-4 border-b">
                    <Button type="button" variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn(editor?.isActive('bold') && "bg-white text-primary")}><Bold className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={cn(editor?.isActive('heading', { level: 2 }) && "bg-white text-primary")}><Heading2 className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={cn(editor?.isActive('bulletList') && "bg-white text-primary")}><List className="h-5 w-5" /></Button>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              </div>
              <div className="flex justify-center pt-10 border-t">
                <Button type="submit" disabled={isSaving} className="px-20 h-16 font-black rounded-2xl shadow-2xl bg-primary text-xl transition-all active:scale-95">
                  {isSaving ? <><Loader2 className="h-6 w-6 animate-spin mr-3" /> 保存中...</> : <><Save className="h-6 w-6 mr-3" /> 保存する</>}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
