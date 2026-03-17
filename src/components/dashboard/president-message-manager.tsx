
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
  Upload, 
  Maximize,
  RefreshCw,
  MessageCircle
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    extensions: [
      StarterKit,
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-2xl shadow-xl my-4 mx-auto max-w-full h-auto',
        },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[300px] p-6 text-sm',
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
      
      // 画像ファイルがある場合は保存時にアップロード
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
      
      toast({ title: "更新しました", description: "会長挨拶を保存しました。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存エラー", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="font-black text-slate-400">確認中...</p>
    </div>
  );

  if (lockoutTime && lockoutTime > Date.now()) return (
    <div className="max-w-4xl mx-auto mt-10">
      <Card className="bg-black text-white p-12 text-center rounded-[3rem]">
        <h2 className="text-3xl font-black text-red-500 mb-4">アクセス禁止 🔒</h2>
        <p className="text-slate-400">頭を冷やして出直してください。</p>
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
          <CardTitle className="text-2xl font-black">会長挨拶 🔒</CardTitle>
          <CardDescription>編集するには認証が必要です。</CardDescription>
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶管理 🔒</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden h-full">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <UserIcon className="h-6 w-6 text-primary" />
                プロフィールとメッセージ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メッセージ題名</FormLabel>
                        <FormControl><Input className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="authorName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会長氏名</FormLabel>
                        <FormControl><Input className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顔写真の選択</FormLabel>
                    <div className="flex gap-2">
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoSelect} />
                      <Button type="button" variant="outline" className="h-12 w-full rounded-xl font-black gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
                        <LucideImage className="h-4 w-4" />
                        画像ファイルを選択
                      </Button>
                    </div>
                  </div>

                  {authorImagePreview && (
                    <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <Maximize className="h-3 w-3" /> 構図の微調整
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">ズーム: {transform.scale.toFixed(0)}%</label>
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
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Type className="h-4 w-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">挨拶本文</span>
                    </div>
                    <div className="border rounded-2xl overflow-hidden bg-white shadow-inner">
                      <div className="flex items-center gap-1 bg-slate-50 p-1 border-b">
                        <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                      </div>
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={isSaving} className="px-12 h-14 font-black rounded-2xl shadow-xl bg-primary">
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Save className="h-5 w-5 mr-3" />}
                      設定を保存する
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">仕上がりプレビュー</h3>
          <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden sticky top-24">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-[10px] font-black flex items-center gap-2 text-primary uppercase tracking-widest">
                <UserIcon className="h-3 w-3" />
                実際の表示イメージ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 px-6 pb-10">
              <div className="flex flex-col items-center mb-8">
                <div className="relative h-24 w-24 rounded-full overflow-hidden shadow-xl mb-4 border-2 border-white bg-slate-50 flex items-center justify-center">
                  {authorImagePreview ? (
                    <Image
                      src={authorImagePreview}
                      alt="Preview"
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
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                      <UserIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <h4 className="font-black text-slate-800 text-base">{form.watch("authorName") || "会長名"}</h4>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">北海学園大学一部新聞会 会長</p>
              </div>
              
              <div className="relative text-center">
                <MessageCircle className="absolute -top-4 -left-2 h-8 w-8 text-primary/5" />
                <h5 className="font-black text-slate-800 text-sm mb-3 border-b pb-2 border-slate-100">
                  {form.watch("title") || "メッセージ題名"}
                </h5>
                <div 
                  className="article-content text-slate-600 font-medium text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
