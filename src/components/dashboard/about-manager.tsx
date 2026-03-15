
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
import { Loader2, Save, Info, Lock, Bold, Italic, Heading2, List, Type, ImageIcon, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";

const aboutSchema = z.object({
  // No fields needed for the form itself if we only use the editor
});

type AboutValues = z.infer<typeof aboutSchema>;

export function AboutManager() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-2xl shadow-xl my-8 mx-auto max-w-full h-auto',
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary font-bold underline',
        },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[500px] p-8 md:p-12',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          handleImageInsert(file);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              handleImageInsert(file);
              return true;
            }
          }
        }
        return false;
      }
    },
  });

  const docRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "about");
  }, [firestore, user]);

  const { data: aboutData, isLoading } = useDoc(docRef);

  async function handleImageInsert(file: File) {
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

  const form = useForm<AboutValues>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (aboutData) {
      if (editor && aboutData.content && editor.getHTML() !== aboutData.content) {
        editor.commands.setContent(aboutData.content);
      }
    }
  }, [aboutData, editor]);

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

  async function onSubmit() {
    if (!firestore || !docRef || !editor) return;

    setIsSaving(true);
    try {
      const htmlContent = editor.getHTML();
      await setDoc(docRef, {
        content: htmlContent, 
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      }, { merge: true });

      toast({ title: "更新しました", description: "About Us の情報を保存しました。" });
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
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Info className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">About Us 🔒</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">編集には管理者認証が必要です。</CardDescription>
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-2xl shadow-md border-2 border-slate-50">
          <Info className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">About Us 🔒</h2>
          <p className="text-sm font-bold text-slate-500">沿革、活動紹介、入会案内などを統制します。</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8 md:p-12">
          <CardTitle className="text-xl font-black flex items-center gap-3"><Type className="h-6 w-6 text-primary" />内容の編集</CardTitle>
          <CardDescription className="font-bold">題名は不要です。本文のみで構成してください。</CardDescription>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type className="h-3 w-3" /> 本文執筆 (画像ドラッグ＆ドロップ対応)
                  </span>
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                    <div className="relative">
                      <input type="file" accept="image/*" className="hidden" id="about-image-upload" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageInsert(file);
                      }}/>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => document.getElementById('about-image-upload')?.click()} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="min-h-[600px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner relative">
                  <EditorContent editor={editor} />
                </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-slate-100 sticky bottom-6 bg-white py-4 z-10">
                <Button type="submit" disabled={isSaving} className="px-12 h-16 font-black rounded-2xl shadow-2xl shadow-primary/20 text-lg">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-3" />}
                  内容を確定する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
