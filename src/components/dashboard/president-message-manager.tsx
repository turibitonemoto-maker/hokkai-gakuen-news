
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
import { Loader2, Save, User as UserIcon, Lock, Bold, Italic, Heading2, List, Type, Image as ImageLucide, Upload, Maximize, MoveHorizontal, MoveVertical } from "lucide-react";
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

  async function handleEditorImageInsert(file: File) {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        editor?.chain().focus().setImage({ src: base64 }).run();
        toast({ title: "画像を本文に埋め込みました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
      setIsProcessing(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-2xl shadow-xl my-8 mx-auto max-w-full h-auto',
        },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[300px] p-8',
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
      if (editor && messageData.content && editor.getHTML() !== messageData.content) {
        editor.commands.setContent(messageData.content);
      }
    }
  }, [messageData, form, editor]);

  const handleFacePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        form.setValue("authorImageUrl", base64);
        toast({ title: "顔写真を取り込みました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
      setIsProcessing(false);
    }
  };

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
        title: values.title,
        authorName: values.authorName,
        authorImageUrl: values.authorImageUrl,
        authorImageTransform: values.authorImageTransform,
        content: htmlContent, 
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "更新しました", description: "会長挨拶を保存しました。" });
    } catch (error: any) {
      console.error("Save failed:", error);
      toast({ variant: "destructive", title: "保存エラー", description: "更新に失敗しました。" });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-slate-400">確認中...</p></div>;

  if (lockoutTime && lockoutTime > Date.now()) return <div className="max-w-4xl mx-auto mt-10"><Card className="bg-black text-white p-12 text-center rounded-[3rem]"><h2 className="text-3xl font-black text-red-500 mb-4">アクセス禁止 🔒</h2><p className="text-slate-400">頭を冷やして出直してください。</p></Card></div>;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked) return <div className="max-w-md mx-auto mt-20"><Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden"><CardHeader className="text-center bg-slate-50/50 py-10"><div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div><CardTitle className="text-2xl font-black">会長挨拶 🔒</CardTitle></CardHeader><CardContent className="p-10 space-y-6"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="text-center h-14 text-lg font-bold rounded-2xl" placeholder="パスワードを入力" autoFocus /><Button className="w-full h-14 font-black text-md rounded-2xl shadow-lg" onClick={handleUnlock}>認証する</Button></CardContent></Card></div>;

  const authorImageUrl = form.watch("authorImageUrl");
  const transform = form.watch("authorImageTransform");

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メッセージ題名</FormLabel>
                      <FormControl><Input placeholder="例：創刊にあたって" className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="authorName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会長氏名</FormLabel>
                      <FormControl><Input placeholder="" className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="authorImageUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                        <UserIcon className="h-3 w-3" /> 顔写真
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input className="h-12 rounded-xl font-bold bg-slate-50" readOnly {...field} /></FormControl>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoUpload} />
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="h-12 px-6 rounded-xl gap-2 font-black"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          画像選択
                        </Button>
                      </div>
                    </FormItem>
                  )} />

                  {authorImageUrl && (
                    <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <Maximize className="h-3 w-3" /> 顔写真構図管制
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500">倍率 (中央: 0%)</label>
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.scale.toFixed(0)}%</span>
                          </div>
                          <Slider min={-200} max={200} step={0.1} value={[transform.scale]} onValueChange={([val]) => form.setValue("authorImageTransform.scale", val)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MoveHorizontal className="h-3 w-3" /> 水平移動</label>
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.x.toFixed(0)}%</span>
                          </div>
                          <Slider min={-200} max={200} step={0.1} value={[transform.x]} onValueChange={([val]) => form.setValue("authorImageTransform.x", val)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MoveVertical className="h-3 w-3" /> 垂直移動</label>
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.y.toFixed(0)}%</span>
                          </div>
                          <Slider min={-200} max={200} step={0.1} value={[transform.y]} onValueChange={([val]) => form.setValue("authorImageTransform.y", val)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">仕上がりプレビュー</label>
                  <div className="relative h-48 w-48 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-slate-50">
                    {authorImageUrl ? (
                      <Image 
                        src={authorImageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-cover"
                        style={{
                          transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                          transition: 'transform 0.1s linear',
                          willChange: 'transform'
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200 italic text-sm">No Image</div>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">
                    ※サイト上での実際の見え方です
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type className="h-3 w-3" /> 挨拶本文
                  </FormLabel>
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                    <div className="relative">
                      <input type="file" accept="image/*" className="hidden" id="editor-image-upload-pres" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditorImageInsert(file);
                      }}/>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => document.getElementById('editor-image-upload-pres')?.click()} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageLucide className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="min-h-[400px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner relative">
                  <EditorContent editor={editor} />
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
