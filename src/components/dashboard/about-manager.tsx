
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info, Lock, Bold, Italic, Heading2, List, Type, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";

const aboutSchema = z.object({});

/**
 * About Us 司令部
 * 組織紹介（沿革、理念、活動内容）を統制します。
 * 本文（HTML）のみを管理する構成に純化しました。
 */
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

  const form = useForm({
    resolver: zodResolver(aboutSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (aboutData && editor) {
      if (aboutData.content && editor.getHTML() !== aboutData.content) {
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
      toast({ title: "更新しました", description: "About Us を保存しました。公式サイトに即座に反映されます。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存エラー" });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <Card className="bg-black text-white rounded-[3rem] text-center p-12">
          <h2 className="text-3xl font-black mb-4 text-red-500">アクセス禁止 🔒</h2>
          <p className="text-slate-400 font-bold text-lg">頭を冷やして出直してください。</p>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Info className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black">About Us 🔒</CardTitle>
            <CardDescription>編集には管理者認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="text-center h-14 text-lg font-bold rounded-2xl" placeholder="パスワードを入力" autoFocus />
            <Button className="w-full h-14 font-black rounded-2xl" onClick={handleUnlock}>認証する</Button>
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
          <p className="text-sm font-bold text-slate-500">組織の紹介、理念を統制します。ここでの更新は公式サイトに即座に反映されます。</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8 md:p-12">
          <CardTitle className="text-xl font-black flex items-center gap-3"><Type className="h-6 w-6 text-primary" />内容の編集</CardTitle>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type className="h-3 w-3" /> 本文執筆
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
                <Button type="button" onClick={onSubmit} disabled={isSaving} className="px-12 h-16 font-black rounded-2xl shadow-2xl shadow-primary/20 text-lg">
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
