
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  User as UserIcon, 
  Lock, 
  Bold, 
  Italic, 
  Heading2, 
  List, 
  Type, 
  Plus,
  Maximize,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from "@/lib/utils";
import Image from "next/image";

const presidentMessageSchema = z.object({
  title: z.string().min(1, "題名を入力してください"),
  authorName: z.string().min(1, "会長の氏名を入力してください"),
  authorImageUrl: z.string().optional().or(z.literal("")),
  authorImageTransform: z.object({
    scale: z.number().default(0),
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ scale: 0, x: 0, y: 0 }),
});

type PresidentMessageValues = z.infer<typeof presidentMessageSchema>;

export function PresidentMessageManager() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [authorImageFile, setAuthorImageFile] = useState<File | null>(null);
  const [authorImagePreview, setAuthorImagePreview] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (messageData.authorImageUrl) {
        setAuthorImagePreview(messageData.authorImageUrl);
      }
      if (editor && messageData.content && editor.getHTML() !== messageData.content) {
        editor.commands.setContent(messageData.content);
      }
    }
  }, [messageData, form, editor]);

  const handleFacePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAuthorImageFile(file);
    const preview = URL.createObjectURL(file);
    setAuthorImagePreview(preview);
    form.setValue("authorImageTransform", { scale: 0, x: 0, y: 0 });
  };

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
          const until = Date.now() + 5 * 60 * 1000;
          setLockoutTime(until);
          localStorage.setItem("lockout_until", until.toString());
          toast({ variant: "destructive", title: "アクセス拒否" });
        }, 800);
      } else {
        toast({ variant: "destructive", title: "不一致" });
      }
    }
  };

  async function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef || !editor) return;
    setIsSaving(true);
    try {
      let finalImageUrl = values.authorImageUrl;
      
      if (authorImageFile) {
        const formData = new FormData();
        formData.append("file", authorImageFile);
        formData.append("folder", `newspaper_archive/governance`);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("画像のアップロードに失敗しました");
        const data = await res.json();
        finalImageUrl = data.secure_url;
      }

      await setDoc(docRef, {
        ...values,
        authorImageUrl: finalImageUrl,
        content: editor.getHTML(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      }, { merge: true });
      
      toast({ title: "更新完了", description: "会長挨拶を永久保存しました。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center p-10">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="font-black text-slate-400">管制情報を照合中...</p>
    </div>
  );

  if (lockoutTime && lockoutTime > Date.now()) return (
    <div className="max-w-4xl mx-auto mt-10">
      <Card className="bg-black text-white p-12 text-center rounded-[3rem]">
        <h2 className="text-3xl font-black text-red-500 mb-4">アクセス禁止 🔒</h2>
        <p className="text-slate-400 font-bold">セキュリティロックが発動しました。時間をおいて再試行してください。</p>
      </Card>
    </div>
  );

  if (isLoading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  if (!isUnlocked) return (
    <div className="max-w-md mx-auto mt-20">
      <Card className="shadow-2xl border-none bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center bg-slate-50/50 py-10">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-800">会長挨拶管理 🔒</CardTitle>
          <CardDescription className="font-bold text-slate-500">この重要区画を編集するには認証が必要です。</CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-6">
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} 
            className="text-center h-14 text-lg font-bold rounded-2xl border-slate-200" 
            placeholder="パスワードを入力" 
            autoFocus 
          />
          <Button className="w-full h-14 font-black text-md rounded-2xl shadow-lg" onClick={handleUnlock}>
            認証する
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶管理 🔒</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">マスター・コントロール</p>
        </div>

        {/* 統合マスター・フレーム (w-48 h-48 固定) */}
        <div className="relative group">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoSelect} />
          <div 
            className="relative w-48 h-48 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-50 cursor-pointer hover:scale-[1.02] transition-all duration-300 flex items-center justify-center group"
            onClick={() => fileInputRef.current?.click()}
          >
            {authorImagePreview ? (
              <Image
                src={authorImagePreview}
                alt="President Preview"
                fill
                className="transition-transform duration-100 ease-linear"
                style={{
                  objectFit: "contain",
                  transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`,
                  willChange: 'transform'
                }}
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <Plus className="h-12 w-12" />
                <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
              </div>
            )}
            
            {authorImagePreview && (
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-primary shadow-lg">写真を変更</span>
              </div>
            )}
          </div>
        </div>

        {authorImagePreview && (
          <div className="w-full max-w-xl bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-500">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <Maximize className="h-3 w-3" /> 構図の微調整
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-500 text-center block uppercase">ズーム: {transform.scale.toFixed(0)}%</label>
                <Slider min={-200} max={200} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("authorImageTransform.scale", val)} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-500 text-center block uppercase">水平: {transform.x.toFixed(0)}%</label>
                <Slider min={-200} max={200} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("authorImageTransform.x", val)} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-500 text-center block uppercase">垂直: {transform.y.toFixed(0)}%</label>
                <Slider min={-200} max={200} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("authorImageTransform.y", val)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-lg font-black flex items-center gap-3">
            <Type className="h-5 w-5 text-primary" />
            プロフィール ＆ 挨拶の編纂
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">挨拶の見出し</FormLabel>
                    <FormControl><Input className="h-14 font-bold rounded-2xl bg-slate-50/50 border-none shadow-inner text-lg" placeholder="例：新入生の皆さんへ" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="authorName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会長氏名</FormLabel>
                    <FormControl><Input className="h-14 font-bold rounded-2xl bg-slate-50/50 border-none shadow-inner text-lg" placeholder="氏名を入力" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">挨拶本文の執筆</FormLabel>
                <div className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-inner">
                  <div className="flex items-center gap-1 bg-slate-50/50 p-3 border-b">
                    <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('bold') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('italic') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('bulletList') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-5 w-5" /></Button>
                  </div>
                  <EditorContent editor={editor} />
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <Button type="submit" disabled={isSaving} className="px-20 h-16 font-black rounded-2xl shadow-2xl bg-primary text-xl hover:scale-105 transition-transform active:scale-95">
                  {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Save className="h-6 w-6 mr-3" />}
                  内容を確定・保存する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
