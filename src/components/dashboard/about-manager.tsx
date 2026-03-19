
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Loader2, Save, Info, Lock, Bold, Italic, Heading2, List, Type, Image as LucideImage, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * About Us 管理画面
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
          class: 'rounded-2xl shadow-xl my-8 mx-auto max-w-full h-auto border-4 border-white',
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
        class: 'ProseMirror outline-none min-h-[500px] p-8 md:p-12 text-lg leading-relaxed',
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `newspaper_archive/about`);
      
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("アップロードに失敗しました");
      const data = await res.json();

      editor?.chain().focus().setImage({ src: data.secure_url }).run();
      toast({ title: "画像を挿入しました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "クラウドへの転送に失敗しました。" });
    } finally {
      setIsProcessing(false);
    }
  }

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
      toast({ title: "認証成功" });
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
          toast({ variant: "destructive", title: "ロックされました" });
        }, 800);
      } else {
        toast({ variant: "destructive", title: "不一致", description: `あと ${3 - newCount} 回でロックされます。` });
      }
    }
  };

  async function handleSave() {
    if (!firestore || !docRef || !editor) return;
    setIsSaving(true);
    
    const htmlContent = editor.getHTML();
    setDocumentNonBlocking(docRef, {
      content: htmlContent, 
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "保存完了", description: "About Us の聖典を更新しました。" });
    }, 500);
  }

  if (isVerifying) return <div className="flex justify-center p-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <Card className="bg-black text-white p-12 rounded-[3rem] text-center border-none shadow-2xl">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4 text-white">アクセス制限中 🔒</h2>
          <p className="text-slate-400 font-bold">セキュリティ保護のため、しばらく時間をおいてから再試行してください。</p>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="text-center bg-slate-50/50 py-10 border-b">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800">About Us 管理 🔒</CardTitle>
            <CardDescription className="font-bold text-slate-500 px-6">この区画を編集するには認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSCODE</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="h-14 text-center text-lg font-bold rounded-2xl border-slate-200 shadow-sm" placeholder="" autoFocus />
            </div>
            <Button className="w-full h-14 font-black rounded-2xl shadow-lg hover:scale-[1.02] transition-transform" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">About Us 管理 🔒</h2>
            <p className="text-sm font-bold text-slate-500">組織の歴史と紹介を編纂します。</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white text-green-600 border-green-200 font-black px-4 py-1 rounded-full flex gap-2 items-center h-10 shadow-sm">
          <ShieldCheck className="h-4 w-4" /> Secure Session
        </Badge>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/30 border-b p-8">
          <CardTitle className="text-lg font-black flex items-center gap-3"><Type className="h-6 w-6 text-primary" />内容の編纂</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            <div className="flex items-center gap-1 bg-slate-100/50 p-2 rounded-2xl w-fit border border-slate-100">
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('bold') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('italic') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('bulletList') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-5 w-5" /></Button>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="about-image-upload" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageInsert(file);
                }}/>
                <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", isProcessing && "animate-pulse")} onClick={() => document.getElementById('about-image-upload')?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <LucideImage className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            
            <div className="min-h-[600px] border-2 border-slate-100 rounded-[3rem] overflow-hidden bg-white shadow-inner">
              <EditorContent editor={editor} />
            </div>

            <div className="flex justify-center pt-6 border-t border-slate-50">
              <Button type="button" onClick={handleSave} disabled={isSaving || isProcessing} className="px-24 h-16 font-black rounded-2xl shadow-2xl bg-primary text-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50">
                {isSaving ? <><Loader2 className="h-6 w-6 animate-spin mr-3" /> 保存中...</> : <><Save className="h-6 w-6 mr-3" /> 内容を保存する</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
