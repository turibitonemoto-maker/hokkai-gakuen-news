"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { 
  Image as LucideImage, 
  Heading2, 
  Loader2, 
  Bold, 
  Italic, 
  List, 
  Maximize, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  ArrowLeft,
  AlignCenter,
  Quote,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const NoteImageComponent = ({ node, updateAttributes, selected, deleteNode }: any) => {
  const setWidth = (width: string) => updateAttributes({ width });
  const currentWidth = node.attrs.width || '60%';
  return (
    <NodeViewWrapper className={cn("resizable-image-container group", selected && "is-selected")}>
      <div className="relative inline-block mx-auto" style={{ width: currentWidth }}>
        <img src={node.attrs.src} alt={node.attrs.alt} className="rounded-2xl shadow-lg border-4 border-white" style={{ width: '100%', height: 'auto' }} />
        {selected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 border rounded-full p-1 shadow-2xl flex items-center gap-1 z-50">
            <button type="button" onClick={() => setWidth('30%')} className={cn("px-3 py-1 rounded-full text-[10px] font-black", currentWidth === '30%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}>小</button>
            <button type="button" onClick={() => setWidth('60%')} className={cn("px-3 py-1 rounded-full text-[10px] font-black", currentWidth === '60%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}>中</button>
            <button type="button" onClick={() => setWidth('100%')} className={cn("px-3 py-1 rounded-full text-[10px] font-black", currentWidth === '100%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}>大</button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button type="button" onClick={() => deleteNode()} className="p-1.5 rounded-full hover:bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      <input type="text" placeholder="キャプション..." value={node.attrs.caption || ''} onChange={(e) => updateAttributes({ caption: e.target.value })} className="w-full mt-3 text-center text-sm font-bold text-slate-400 bg-transparent outline-none" />
    </NodeViewWrapper>
  );
};

const CustomResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '60%', renderHTML: attr => ({ style: `width: ${attr.width}; height: auto;` }) },
      caption: { default: '', renderHTML: attr => ({ 'data-caption': attr.caption }) },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(NoteImageComponent); },
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'resizable-image-container' }, ['img', { ...HTMLAttributes, class: 'mx-auto' }], ['span', { class: 'image-caption-text' }, HTMLAttributes['data-caption'] || '']];
  },
});

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.literal("Standard"),
  content: z.string().min(1, "本文を入力してください"),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
  publishDate: z.string(),
  mainImageUrl: z.string().optional().or(z.literal("")),
  mainImageTransform: z.object({ scale: z.number().default(0), x: z.number().default(0), y: z.number().default(0) }).default({ scale: 0, x: 0, y: 0 }),
  isPublished: z.boolean().default(false),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export function ArticleForm({ article, onSuccess }: { article?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [editorFiles, setEditorFiles] = useState<Map<string, File>>(new Map());
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const editorImageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || "",
      articleType: "Standard",
      content: article?.content || "",
      categoryId: (article?.categoryId === "Viewer" ? "Campus" : article?.categoryId) || "Campus",
      publishDate: article?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: article?.mainImageUrl || "",
      mainImageTransform: article?.mainImageTransform || { scale: 0, x: 0, y: 0 },
      isPublished: article?.isPublished || false,
    },
  });

  const transform = form.watch("mainImageTransform");

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomResizableImage,
      LinkExtension.configure({ 
        openOnClick: false, 
        HTMLAttributes: { class: 'text-primary font-bold underline' },
        autolink: true
      }),
      Placeholder.configure({ placeholder: 'ここから物語を始めてください...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: article?.content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => form.setValue("content", editor.getHTML()),
    editorProps: { attributes: { class: 'ProseMirror outline-none min-h-[600px] py-10 max-w-3xl mx-auto' } },
  });

  useEffect(() => { if (article?.mainImageUrl) setMainImagePreview(article.mainImageUrl); }, [article]);

  const handleEditorImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || !editor) return;
    const blobUrl = URL.createObjectURL(file);
    setEditorFiles(prev => new Map(prev).set(blobUrl, file));
    editor.chain().focus().setImage({ src: blobUrl }).run();
    if (e.target) e.target.value = "";
  }, [editor]);

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const blobUrl = URL.createObjectURL(file);
    setMainImageFile(file);
    setMainImagePreview(blobUrl);
    if (e.target) e.target.value = "";
  };

  async function uploadToCloudinary(file: File, folder: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("アップロードに失敗しました");
    const data = await res.json();
    return data.secure_url;
  }

  async function onSubmit(values: ArticleFormValues) {
    if (!firestore || !editor) return;
    setIsSaving(true);
    try {
      const uniqueId = article?.id || Date.now().toString(36);
      const folderPath = `newspaper_archive/${uniqueId}`;
      
      let finalMainImageUrl = values.mainImageUrl;
      if (mainImageFile) finalMainImageUrl = await uploadToCloudinary(mainImageFile, folderPath);

      let finalContent = editor.getHTML();
      const blobRegex = /src="(blob:[^"]+)"/g;
      let match;
      const uploadedMap = new Map<string, string>();
      while ((match = blobRegex.exec(finalContent)) !== null) {
        const file = editorFiles.get(match[1]);
        if (file) {
          const cloudUrl = await uploadToCloudinary(file, folderPath);
          uploadedMap.set(match[1], cloudUrl);
        }
      }
      uploadedMap.forEach((cloud, blob) => finalContent = finalContent.split(blob).join(cloud));

      const data = { ...values, content: finalContent, mainImageUrl: finalMainImageUrl, updatedAt: serverTimestamp(), updatedBy: user?.email || "unknown" };
      if (article?.id) setDocumentNonBlocking(doc(firestore, "articles", article.id), data, { merge: true });
      else addDocumentNonBlocking(collection(firestore, "articles"), { ...data, createdAt: serverTimestamp(), viewCount: 0 });

      toast({ title: "保存が完了しました" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-body">
      <input type="file" accept="image/*" className="hidden" ref={editorImageInputRef} onChange={handleEditorImageSelect} />
      <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />

      <header className="sticky top-0 z-50 bg-white/95 border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onSuccess} className="rounded-full"><ArrowLeft className="h-6 w-6 text-slate-600" /></Button>
          <Button variant="ghost" size="icon" className={cn("rounded-full", (mainImagePreview || form.watch("mainImageUrl")) && "text-primary")} onClick={() => mainImageInputRef.current?.click()}><LucideImage className="h-6 w-6" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Form {...form}>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" className="font-black text-slate-700 h-9 px-4 rounded-full">公開設定</Button></PopoverTrigger>
              <PopoverContent className="w-80 p-6 rounded-3xl shadow-2xl" align="end">
                <div className="space-y-6">
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">カテゴリー</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Campus">キャンパス</SelectItem><SelectItem value="Event">イベント</SelectItem><SelectItem value="Interview">インタビュー</SelectItem><SelectItem value="Sports">スポーツ</SelectItem><SelectItem value="Column">コラム</SelectItem><SelectItem value="Opinion">オピニオン</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <FormField control={form.control} name="publishDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">公開日</FormLabel><FormControl><Input type="date" className="h-12 rounded-xl font-bold" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="isPublished" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-slate-50/50"><FormLabel className="text-sm font-black">公開する</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                  <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="w-full h-14 rounded-2xl font-black text-lg bg-primary">{isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}保存する</Button>
                </div>
              </PopoverContent>
            </Popover>
          </Form>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-3xl mx-auto px-6 pt-12">
          {mainImagePreview && (
            <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-50 mb-12">
              <Image src={mainImagePreview} alt="" fill className="object-contain" style={{ transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})` }} unoptimized />
              <div className="absolute top-4 right-4 flex gap-2">
                <Popover><PopoverTrigger asChild><Button variant="secondary" size="icon" className="rounded-full shadow-lg"><Maximize className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-80 p-6 rounded-3xl"><h4 className="text-[10px] font-black uppercase mb-4">調整</h4><div className="space-y-4"><div><label className="text-[9px] font-bold">ズーム</label><Slider min={-500} max={500} step={1} value={[transform.scale]} onValueChange={([v]) => form.setValue("mainImageTransform.scale", v)} /></div><div><label className="text-[9px] font-bold">水平</label><Slider min={-500} max={500} step={1} value={[transform.x]} onValueChange={([v]) => form.setValue("mainImageTransform.x", v)} /></div><div><label className="text-[9px] font-bold">垂直</label><Slider min={-500} max={500} step={1} value={[transform.y]} onValueChange={([v]) => form.setValue("mainImageTransform.y", v)} /></div><Button variant="ghost" className="w-full text-[10px]" onClick={() => form.setValue("mainImageTransform", { scale: 0, x: 0, y: 0 })}>リセット</Button></div></PopoverContent></Popover>
                <Button variant="destructive" size="icon" className="rounded-full" onClick={() => { setMainImagePreview(""); setMainImageFile(null); form.setValue("mainImageUrl", ""); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
          <textarea className="w-full text-4xl md:text-5xl font-black border-none focus:ring-0 resize-none px-0 leading-tight placeholder:text-slate-200 bg-transparent" placeholder="記事タイトル" rows={1} value={form.watch("title")} onChange={(e) => { form.setValue("title", e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
          <div className="mt-8">{editor && <div className="prose-container relative"><EditorContent editor={editor} /></div>}</div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t z-50 h-16 flex items-center px-4 gap-2">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-12 w-12 text-white bg-primary rounded-2xl shadow-xl" onClick={() => editorImageInputRef.current?.click()}><Plus className="h-7 w-7" /></Button>
          <Separator orientation="vertical" className="h-8 mx-2" />
          <div className="flex-1 flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("rounded-xl", editor?.isActive('bold') && "bg-primary/5 text-primary")}><Bold className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={cn("rounded-xl", editor?.isActive({ textAlign: 'center' }) && "bg-primary/5 text-primary")}><AlignCenter className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { 
              const url = window.prompt('埋め込むURLを入力:'); 
              if (url) editor?.chain().focus().setLink({ href: url }).run(); 
              else if (url === '') editor?.chain().focus().unsetLink().run();
            }} className={cn("rounded-xl", editor?.isActive('link') && "bg-primary/5 text-primary")}><LinkIcon className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={cn("rounded-xl", editor?.isActive('blockquote') && "bg-primary/5 text-primary")}><Quote className="h-5 w-5" /></Button>
          </div>
          <div className="hidden sm:block text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{editor?.getText().length.toLocaleString() || 0} 文字</div>
        </div>
      </div>
    </div>
  );
}
