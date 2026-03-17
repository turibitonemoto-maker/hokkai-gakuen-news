
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
  Image as LucideImage, 
  Maximize,
  RefreshCw,
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
        class: 'ProseMirror outline-none min-h-[400px] p-8 text-lg leading-relaxed',
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

  // 画像変更時に座標をリセット
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
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="font-black text-slate-400">認証情報を照合中...</p>
    </div>
  );

  if (lockoutTime && lockoutTime > Date.now()) return (
    <div className="max-w-4xl mx-auto mt-10">
      <Card className="bg-black text-white p-12 text-center rounded-[3rem]">
        <h2 className="text-3xl font-black text-red-500 mb-4">アクセス禁止 🔒</h2>
        <p className="text-slate-400 font-bold">何度も失敗したためロックされています。時間をおいてから出直してください。</p>
      </Card>
    </div>
  );

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!isUnlocked) return (
    <div className="max-w-md mx-auto mt-20">
      <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
        <CardHeader className="text-center bg-slate-50/50 py-10">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">会長挨拶管理 🔒</CardTitle>
          <CardDescription className="font-bold">この重要区画を編集するには認証が必要です。</CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-6">
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} 
            className="text-center h-14 text-lg font-bold rounded-2xl" 
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          会長挨拶管理 🔒
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <CardTitle className="text-lg font-black flex items-center gap-3">
                <Type className="h-5 w-5 text-primary" />
                プロフィール設定
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">挨拶の見出し</FormLabel>
                        <FormControl><Input className="h-12 font-bold rounded-xl bg-slate-50/50" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="authorName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会長氏名</FormLabel>
                        <FormControl><Input className="h-12 font-bold rounded-xl bg-slate-50/50" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顔写真の差し替え</FormLabel>
                    <div className="flex gap-2">
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoSelect} />
                      <Button type="button" variant="outline" className="h-12 w-full rounded-xl font-black gap-2 border-dashed border-2" onClick={() => fileInputRef.current?.click()}>
                        <LucideImage className="h-4 w-4" />
                        新しい画像を選択
                      </Button>
                    </div>
                  </div>

                  {authorImagePreview && (
                    <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in fade-in">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <Maximize className="h-3 w-3" /> 構図の微調整
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">拡大: {transform.scale.toFixed(0)}%</label>
                          <Slider min={-200} max={200} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("authorImageTransform.scale", val)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">水平位置: {transform.x.toFixed(0)}%</label>
                          <Slider min={-200} max={200} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("authorImageTransform.x", val)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">垂直位置: {transform.y.toFixed(0)}%</label>
                          <Slider min={-200} max={200} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("authorImageTransform.y", val)} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">挨拶本文の編纂</FormLabel>
                    <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-white shadow-inner">
                      <div className="flex items-center gap-1 bg-slate-50/50 p-2 border-b">
                        <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('bold') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('italic') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", editor?.isActive('bulletList') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-5 w-5" /></Button>
                      </div>
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button type="submit" disabled={isSaving} className="px-16 h-16 font-black rounded-2xl shadow-2xl bg-primary text-lg hover:scale-105 transition-transform active:scale-95">
                      {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Save className="h-6 w-6 mr-3" />}
                      この内容で確定する
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">表示サイトの仕上がり同期</h3>
          <div className="sticky top-24 space-y-6">
            <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden p-10 flex flex-col items-center justify-center aspect-square">
              <div className="relative w-full h-full rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-50 flex items-center justify-center">
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
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300 gap-3">
                    <UserIcon className="h-16 w-16 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">NO IMAGE</span>
                  </div>
                )}
              </div>
            </Card>
            <div className="px-6 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Preview Protocol</p>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                表示サイトの「会長挨拶ページ」と全く同じ形状です。<br />
                枠内に正しく収まっているか確認してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
