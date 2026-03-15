"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info, Lock, Bold, Italic, Heading2, List, Type, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";

/**
 * About Us 管理画面
 * settings/about の content フィールドを編集・保存します。
 * タイトル入力を廃止し、内容本位の構成に純化。
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
        toast({ title: "画像を挿入しました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
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
    try {
      const htmlContent = editor.getHTML();
      await setDoc(docRef, {
        content: htmlContent, 
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      }, { merge: true });
      toast({ title: "保存完了", description: "About Us を更新しました。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "エラー", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return <div className="flex justify-center p-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  if (lockoutTime && lockoutTime > Date.now()) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <Card className="bg-black text-white p-12 rounded-[2rem] text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">アクセス制限中 🔒</h2>
          <p className="text-slate-400">しばらく時間をおいてから再試行してください。</p>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="shadow-2xl border-none rounded-2xl overflow-hidden">
          <CardHeader className="text-center bg-slate-50/50 py-8">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="h-8 w-8 text-primary" /></div>
            <CardTitle className="text-xl font-bold">About Us 管理 🔒</CardTitle>
            <CardDescription>編集するには認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} className="h-12 text-center font-bold" placeholder="パスワードを入力" autoFocus />
            <Button className="w-full h-12 font-bold" onClick={handleUnlock}>認証</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-xl shadow-sm border">
          <Info className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">About Us 管理 🔒</h2>
          <p className="text-sm text-slate-500">組織の紹介ページを編集します。</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/30 border-b p-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2"><Type className="h-5 w-5 text-primary" />内容の編集</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg w-fit">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="about-image-upload" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageInsert(file);
                }}/>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('about-image-upload')?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="min-h-[500px] border rounded-xl overflow-hidden bg-white shadow-inner">
              <EditorContent editor={editor} />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleSave} disabled={isSaving} className="px-10 h-12 font-bold shadow-lg">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                内容を確定する
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
