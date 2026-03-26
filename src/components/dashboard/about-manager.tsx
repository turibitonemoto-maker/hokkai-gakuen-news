
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Loader2, Save, Info, Bold, Italic, Heading2, List, Type, Image as LucideImage, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function AboutManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [editorFiles, setEditorFiles] = useState<Map<string, File>>(new Map());
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
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
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
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
        class: 'ProseMirror outline-none min-h-[500px] p-8 md:p-12 text-lg leading-relaxed text-slate-700',
      },
    },
  });

  const docRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "settings", "about");
  }, [firestore, user]);

  const { data: aboutData, isLoading } = useDoc(docRef);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const blobUrl = URL.createObjectURL(file);
    setEditorFiles(prev => new Map(prev).set(blobUrl, file));
    editor?.chain().focus().setImage({ src: blobUrl }).run();
    if (e.target) e.target.value = "";
  }, [editor]);

  useEffect(() => {
    if (aboutData && editor) {
      if (aboutData.content && editor.getHTML() !== aboutData.content) {
        editor.commands.setContent(aboutData.content);
      }
    }
  }, [aboutData, editor]);

  async function handleSave() {
    if (!firestore || !docRef || !editor) return;
    setIsSaving(true);
    try {
      let finalContent = editor.getHTML();
      const blobRegex = /src="(blob:[^"]+)"/g;
      let match;
      const uploadedUrlsMap = new Map<string, string>();
      const blobUrls: string[] = [];
      while ((match = blobRegex.exec(finalContent)) !== null) blobUrls.push(match[1]);

      for (const blobUrl of blobUrls) {
        const file = editorFiles.get(blobUrl);
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", `newspaper_archive/about`);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("アップロードに失敗しました");
          const data = await res.json();
          uploadedUrlsMap.set(blobUrl, data.secure_url);
        }
      }

      uploadedUrlsMap.forEach((cloudUrl, blobUrl) => {
        finalContent = finalContent.split(blobUrl).join(cloudUrl);
      });

      setDocumentNonBlocking(docRef, {
        content: finalContent, 
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      }, { merge: true });

      toast({ title: "保存しました" });
      setEditorFiles(new Map());
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isVerifying) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-slate-400">照合中...</p></div>;
  if (lockoutTime && lockoutTime > Date.now()) return <div className="max-w-4xl mx-auto mt-10"><Card className="shadow-2xl rounded-[3rem] p-16 text-center space-y-8"><div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto"><ShieldAlert className="h-12 w-12 text-red-500" /></div><h2 className="text-3xl font-black text-slate-800">セキュリティ・ロック</h2><p className="text-slate-500 font-bold">一時的に制限しています。あと {Math.ceil((lockoutTime - Date.now()) / 60000)} 分後にお試しください。</p></Card></div>;
  
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">About Us 管理</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">編集には認証が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSCODE</label>
              <Input type="password" placeholder="パスワードを入力" className="text-center h-14 text-lg font-bold rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} autoFocus />
            </div>
            <Button className="w-full h-14 font-black rounded-2xl" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><Info className="h-8 w-8 text-primary" /></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">About Us 管理</h2>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/30 border-b p-8">
          <CardTitle className="text-lg font-black flex items-center gap-3"><Type className="h-6 w-6 text-primary" />内容の編集</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            <div className="flex items-center gap-1 bg-slate-100/50 p-2 rounded-2xl w-fit border border-slate-100">
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('bold') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('italic') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-5 w-5" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl transition-all", editor?.isActive('bulletList') && "bg-white shadow-md text-primary")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-5 w-5" /></Button>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <input type="file" accept="image/*" className="hidden" id="about-image-upload" onChange={handleImageSelect}/>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl transition-all" onClick={() => document.getElementById('about-image-upload')?.click()}><LucideImage className="h-5 w-5" /></Button>
            </div>
            
            <div className="min-h-[500px] border-2 border-slate-100 rounded-[3rem] overflow-hidden bg-white shadow-inner">
              <EditorContent editor={editor} />
            </div>

            <div className="flex justify-center pt-6 border-t border-slate-50">
              <Button type="button" onClick={handleSave} disabled={isSaving} className="px-24 h-16 font-black rounded-2xl shadow-2xl bg-primary text-xl active:scale-95 disabled:opacity-50 transition-all">
                {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Save className="h-6 w-6 mr-3" />}
                {isSaving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
