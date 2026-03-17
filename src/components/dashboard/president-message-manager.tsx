
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
import { Loader2, Save, User as UserIcon, Lock, Bold, Italic, Heading2, List, Type, Image as LucideImage, Upload, Maximize, MoveHorizontal, MoveVertical } from "lucide-react";
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

  const authorImageUrl = form.watch("authorImageUrl");
  const transform = form.watch("authorImageTransform");

  // 画像変更時に座標を完全に初期化
  useEffect(() => {
    if (authorImageUrl) {
      form.setValue("authorImageTransform", { scale: 0, x: 0, y: 0 });
    }
  }, [authorImageUrl, form]);

  const editor = useEditor({
    extensions: [StarterKit, ImageExtension.configure({ HTMLAttributes: { class: 'rounded-2xl shadow-xl my-8 mx-auto max-w-full h-auto' } })],
    content: "",
    immediatelyRender: false,
    editorProps: { attributes: { class: 'ProseMirror outline-none min-h-[300px] p-8' } },
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
        form.setValue("authorImageUrl", reader.result as string);
        toast({ title: "顔写真を取り込みました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗" });
      setIsProcessing(false);
    }
  };

  const handleUnlock = () => {
    if (lockoutTime && lockoutTime > Date.now()) return;
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true); setFailCount(0); toast({ title: "認証完了" });
    } else {
      const newCount = failCount + 1; setFailCount(newCount);
      if (newCount >= 3) {
        setIsVerifying(true); setTimeout(() => {
          setIsVerifying(false); const until = Date.now() + 5 * 60 * 1000; setLockoutTime(until);
          localStorage.setItem("lockout_until", until.toString()); toast({ variant: "destructive", title: "アクセス拒否" });
        }, 800);
      } else { toast({ variant: "destructive", title: "不一致" }); }
    }
  };

  async function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef || !editor) return;
    setIsSaving(true);
    try {
      await setDoc(docRef, { ...values, content: editor.getHTML(), updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "更新しました" });
    } catch (error: any) { toast({ variant: "destructive", title: "保存エラー" }); } finally { setIsSaving(false); }
  }

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-slate-400">確認中...</p></div>;
  if (lockoutTime && lockoutTime > Date.now()) return <div className="max-w-4xl mx-auto mt-10"><Card className="bg-black text-white p-12 text-center rounded-[3rem]"><h2 className="text-3xl font-black text-red-500 mb-4">アクセス禁止 🔒</h2><p className="text-slate-400">頭を冷やして出直してください。</p></Card></div>;
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isUnlocked) return <div className="max-w-md mx-auto mt-20"><Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden"><CardHeader className="text-center bg-slate-50/50 py-10"><div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div><CardTitle className="text-2xl font-black">会長挨拶 🔒</CardTitle></CardHeader><CardContent className="p-10 space-y-6"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="text-center h-14 text-lg font-bold rounded-2xl" placeholder="パスワードを入力" autoFocus /><Button className="w-full h-14 font-black text-md rounded-2xl shadow-lg" onClick={handleUnlock}>認証する</Button></CardContent></Card></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4"><h2 className="text-3xl font-black text-slate-800 tracking-tight">会長挨拶 🔒</h2></div>
      <Card className="shadow-sm border-slate-200 rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-xl font-black flex items-center gap-3"><UserIcon className="h-6 w-6 text-primary" />メッセージの編集</CardTitle></CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">題名</FormLabel><FormControl><Input className="h-12 font-bold rounded-xl" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="authorName" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">氏名</FormLabel><FormControl><Input className="h-12 font-bold rounded-xl" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="authorImageUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顔写真</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input className="h-12 rounded-xl font-bold bg-slate-50" readOnly {...field} /></FormControl>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFacePhotoUpload} />
                        <Button type="button" variant="outline" className="h-12 px-6 rounded-xl font-black" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}選択
                        </Button>
                      </div>
                    </FormItem>
                  )} />
                  {authorImageUrl && (
                    <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest"><Maximize className="h-3 w-3 inline mr-1" /> 構図調整</h4>
                      <div className="space-y-4">
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500">ズーム: {transform.scale.toFixed(0)}%</label><Slider min={-200} max={200} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("authorImageTransform.scale", val)} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500">水平: {transform.x.toFixed(0)}%</label><Slider min={-200} max={200} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("authorImageTransform.x", val)} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500">垂直: {transform.y.toFixed(0)}%</label><Slider min={-200} max={200} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("authorImageTransform.y", val)} /></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">プレビュー</label>
                  <div className="relative h-48 w-48 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
                    {authorImageUrl ? (
                      <Image src={authorImageUrl} alt="Preview" fill className="transition-transform duration-100" style={{ objectFit: "contain", transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`, willChange: 'transform' }} unoptimized />
                    ) : ( <div className="text-slate-200 italic text-sm">No Image</div> )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-8 border-t border-slate-100"><Button type="submit" disabled={isSaving} className="px-12 h-14 font-black rounded-2xl shadow-xl"><Save className="h-5 w-5 mr-3" />保存する</Button></div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
