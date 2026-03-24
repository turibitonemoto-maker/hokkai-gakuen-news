
"use client";

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Loader2, Save, Info, Bold, Italic, Heading2, List, Type, Image as LucideImage } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { cn } from "@/lib/utils";

export function AboutManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [editorFiles, setEditorFiles] = useState<Map<string, File>>(new Map());
  
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
      while ((match = blobRegex.exec(finalContent)) !== null) {
        blobUrls.push(match[1]);
      }

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

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">About Us 管理</h2>
            <p className="text-sm font-bold text-slate-500">紹介ページの内容を管理します。</p>
          </div>
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
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="about-image-upload" onChange={handleImageSelect}/>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl transition-all" onClick={() => document.getElementById('about-image-upload')?.click()} disabled={isSaving}>
                  <LucideImage className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="min-h-[600px] border-2 border-slate-100 rounded-[3rem] overflow-hidden bg-white shadow-inner">
              <EditorContent editor={editor} />
            </div>

            <div className="flex justify-center pt-6 border-t border-slate-50">
              <Button type="button" onClick={handleSave} disabled={isSaving} className="px-24 h-16 font-black rounded-2xl shadow-2xl bg-primary text-xl hover:scale-105 transition-transform active:scale-95 disabled:opacity-50">
                {isSaving ? <><Loader2 className="h-6 w-6 animate-spin mr-3" /> 保存中...</> : <><Save className="h-6 w-6 mr-3" /> 保存する</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
