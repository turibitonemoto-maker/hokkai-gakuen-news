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
import { Badge } from "@/components/ui/badge";
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
  RefreshCw, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  Heading3,
  ArrowLeft,
  MoreVertical,
  AlignCenter,
  Quote,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

/**
 * note風：画像サイズ選択 ＆ 抹消機能付きコンポーネント
 */
const NoteImageComponent = ({ node, updateAttributes, selected, deleteNode }: any) => {
  const setWidth = (width: string) => {
    updateAttributes({ width });
  };

  const currentWidth = node.attrs.width || '60%';

  return (
    <NodeViewWrapper className={cn("resizable-image-container group", selected && "is-selected")}>
      <div className="relative inline-block mx-auto" style={{ width: currentWidth }}>
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt} 
          className="rounded-2xl shadow-lg border-4 border-white transition-all duration-300"
          style={{ width: '100%', height: 'auto' }}
        />
        
        {selected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full p-1 shadow-2xl flex items-center gap-1 z-50 animate-in fade-in slide-in-from-bottom-2">
            <button 
              type="button"
              onClick={() => setWidth('30%')}
              className={cn("px-3 py-1 rounded-full text-[10px] font-black transition-all", currentWidth === '30%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}
            >
              小
            </button>
            <button 
              type="button"
              onClick={() => setWidth('60%')}
              className={cn("px-3 py-1 rounded-full text-[10px] font-black transition-all", currentWidth === '60%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}
            >
              中
            </button>
            <button 
              type="button"
              onClick={() => setWidth('100%')}
              className={cn("px-3 py-1 rounded-full text-[10px] font-black transition-all", currentWidth === '100%' ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-500")}
            >
              大
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button 
              type="button"
              onClick={() => deleteNode()}
              className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-all"
              title="画像を削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        placeholder="画像の説明（キャプション）を入力..."
        value={node.attrs.caption || ''}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className="w-full mt-3 text-center text-sm font-bold text-slate-400 bg-transparent outline-none border-none placeholder:text-slate-200 focus:placeholder:opacity-0 transition-all"
      />
    </NodeViewWrapper>
  );
};

const CustomResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '60%',
        renderHTML: attributes => ({
          style: `width: ${attributes.width}; height: auto;`,
        }),
      },
      caption: {
        default: '',
        renderHTML: attributes => ({
          'data-caption': attributes.caption,
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(NoteImageComponent);
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { class: 'resizable-image-container' }, 
      ['img', { ...HTMLAttributes, class: 'mx-auto' }],
      ['span', { class: 'image-caption-text' }, HTMLAttributes['data-caption'] || '']
    ];
  },
});

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.literal("Standard"),
  content: z.string().min(1, "本文を入力してください"),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
  publishDate: z.string(),
  mainImageUrl: z.string().optional().or(z.literal("")),
  mainImageTransform: z.object({
    scale: z.number().default(0),
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ scale: 0, x: 0, y: 0 }),
  isPublished: z.boolean().default(false),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export function ArticleForm({ article, onSuccess }: { article?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
      }),
      Placeholder.configure({
        placeholder: 'ご自由にお書きください。',
        emptyNodeClass: 'is-editor-empty',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: article?.content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[600px] py-10 px-0 max-w-3xl mx-auto',
      },
    },
  });

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  // 即時アップロード・プロトコル
  const handleEditorImageInsert = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || !editor) return;
    setIsProcessing(true);
    try {
      const uniqueSuffix = Date.now().toString(36);
      const subFolder = sanitizeFolderName(form.getValues("title") || "editor_images");
      const folderPath = `newspaper_archive/${subFolder}_${uniqueSuffix}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folderPath);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("アップロードに失敗しました");
      const data = await res.json();

      editor.chain().focus().setImage({ src: data.secure_url }).run();
      toast({ title: "画像を挿入しました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "アップロード中にエラーが発生しました。" });
    } finally {
      setIsProcessing(false);
    }
  }, [editor, form, toast]);

  useEffect(() => {
    if (article?.mainImageUrl) setMainImagePreview(article.mainImageUrl);
  }, [article]);

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const handleMainImageRemove = async () => {
    const currentUrl = form.getValues("mainImageUrl");
    setMainImagePreview("");
    setMainImageFile(null);
    form.setValue("mainImageUrl", "");
    
    // Cloudinaryにある旧URLなら即座に抹消を試みる
    if (currentUrl && currentUrl.includes("res.cloudinary.com")) {
      try {
        await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [currentUrl] }),
        });
        toast({ title: "画像をクラウドから抹消しました" });
      } catch (e) {
        console.error("Cloud delete failed:", e);
      }
    }
  };

  async function onSubmit(values: ArticleFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const uniqueSuffix = Date.now().toString(36);
      const subFolder = sanitizeFolderName(values.title);
      const folderPath = `newspaper_archive/${subFolder}_${uniqueSuffix}`;
      
      const oldMainImageUrl = article?.mainImageUrl;
      let finalMainImageUrl = values.mainImageUrl;

      if (mainImageFile) {
        const formData = new FormData();
        formData.append("file", mainImageFile);
        formData.append("folder", folderPath);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("メイン画像のアップロードに失敗しました");
        const data = await res.json();
        finalMainImageUrl = data.secure_url;

        // 新画像アップロード成功時、旧メイン画像があれば削除
        if (oldMainImageUrl && oldMainImageUrl !== finalMainImageUrl && oldMainImageUrl.includes("res.cloudinary.com")) {
          try {
            await fetch("/api/upload/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ urls: [oldMainImageUrl] }),
            });
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        }
      }

      const data = {
        ...values,
        mainImageUrl: finalMainImageUrl,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      };

      if (article?.id) {
        const docRef = doc(firestore, "articles", article.id);
        setDocumentNonBlocking(docRef, data, { merge: true });
      } else {
        const colRef = collection(firestore, "articles");
        addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
      }
      toast({ title: "保存完了" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  const setLink = useCallback(() => {
    const url = window.prompt('URLを入力してください');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-col min-h-screen bg-white font-body">
      <input type="file" accept="image/*" className="hidden" ref={editorImageInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEditorImageInsert(file); }} />
      <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />

      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onSuccess} className="rounded-full"><ArrowLeft className="h-6 w-6 text-slate-600" /></Button>
          <Button variant="ghost" size="icon" className={cn("rounded-full", mainImagePreview ? "text-primary" : "text-slate-400")} onClick={() => mainImageInputRef.current?.click()}><LucideImage className="h-6 w-6" /></Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Form {...form}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-black text-slate-700 h-9 px-4 rounded-full">公開設定</Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] max-w-sm p-6 rounded-3xl shadow-2xl border-none" align="end">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg">記事の公開設定</h3>
                    <Badge variant="outline" className="text-[10px] font-black uppercase">Admin Only</Badge>
                  </div>
                  <Separator />
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Campus">キャンパス</SelectItem>
                          <SelectItem value="Event">イベント</SelectItem>
                          <SelectItem value="Interview">インタビュー</SelectItem>
                          <SelectItem value="Sports">スポーツ</SelectItem>
                          <SelectItem value="Column">コラム</SelectItem>
                          <SelectItem value="Opinion">オピニオン</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="publishDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">公開日</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl font-bold bg-slate-50" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isPublished" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-slate-50/50">
                      <FormLabel className="text-sm font-black">公式サイトに公開</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="w-full h-14 rounded-2xl font-black text-lg bg-primary">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}保存する
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </Form>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-3xl mx-auto px-6 pt-12">
          {mainImagePreview && (
            <div className="relative group aspect-[21/9] w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-50 mb-12">
              <Image 
                src={mainImagePreview} alt="" fill className="object-contain transition-transform" 
                style={{ transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})` }}
                unoptimized
              />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100">
                <Popover>
                  <PopoverTrigger asChild><Button variant="secondary" size="icon" className="rounded-full shadow-lg"><Maximize className="h-4 w-4 text-primary" /></Button></PopoverTrigger>
                  <PopoverContent className="w-80 p-6 rounded-3xl shadow-2xl border-none">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Maximize className="h-3 w-3 text-primary" /> 見出し画像の調整</h4>
                      <div className="space-y-4">
                        <div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 uppercase">ズーム: {transform.scale.toFixed(0)}%</label><Slider min={-500} max={500} step={1} value={[transform.scale]} onValueChange={([v]) => form.setValue("mainImageTransform.scale", v)} /></div>
                        <div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 uppercase">水平: {transform.x.toFixed(0)}%</label><Slider min={-500} max={500} step={1} value={[transform.x]} onValueChange={([v]) => form.setValue("mainImageTransform.x", v)} /></div>
                        <div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 uppercase">垂直: {transform.y.toFixed(0)}%</label><Slider min={-500} max={500} step={1} value={[transform.y]} onValueChange={([v]) => form.setValue("mainImageTransform.y", v)} /></div>
                      </div>
                      <Button variant="ghost" className="w-full text-[10px] font-black" onClick={() => form.setValue("mainImageTransform", { scale: 0, x: 0, y: 0 })}>リセット</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="destructive" size="icon" className="rounded-full" onClick={handleMainImageRemove}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          <textarea
            className="w-full text-4xl md:text-5xl font-black border-none focus:ring-0 resize-none px-0 py-2 leading-tight placeholder:text-slate-200 bg-transparent min-h-[80px]"
            placeholder="記事タイトル"
            rows={1}
            value={form.watch("title")}
            onChange={(e) => {
              form.setValue("title", e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />

          <div className="mt-8">
            {editor && (
              <div className="prose-container relative">
                <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-primary hover:bg-primary/90 rounded-2xl shadow-xl -ml-12" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-56 p-2 rounded-3xl shadow-2xl border-none">
                      <div className="grid gap-1">
                        <button type="button" onClick={() => editorImageInputRef.current?.click()} className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 rounded-2xl" disabled={isProcessing}>
                          <div className="bg-blue-50 p-2 rounded-xl"><LucideImage className="h-5 w-5 text-blue-500" /></div>
                          <span className="text-sm font-black text-slate-700">画像を挿入</span>
                        </button>
                        <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 rounded-2xl">
                          <div className="bg-slate-50 p-2 rounded-xl"><Heading2 className="h-5 w-5 text-slate-500" /></div>
                          <span className="text-sm font-black text-slate-700">大見出し</span>
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </FloatingMenu>
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t z-50">
        <div className="max-w-3xl mx-auto h-16 flex items-center px-4 gap-2">
          <Button variant="ghost" size="icon" className="h-12 w-12 text-white bg-primary rounded-2xl shadow-xl" onClick={() => editorImageInputRef.current?.click()} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-7 w-7" />}
          </Button>
          <Separator orientation="vertical" className="h-8 mx-2" />
          <div className="flex-1 flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("rounded-xl", editor?.isActive('bold') && "bg-primary/5 text-primary")}><Bold className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={cn("rounded-xl", editor?.isActive({ textAlign: 'center' }) && "bg-primary/5 text-primary")}><AlignCenter className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={setLink} className={cn("rounded-xl", editor?.isActive('link') && "bg-primary/5 text-primary")}><LinkIcon className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={cn("rounded-xl", editor?.isActive('blockquote') && "bg-primary/5 text-primary")}><Quote className="h-5 w-5" /></Button>
          </div>
          <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{editor?.getText().length.toLocaleString()} 文字</div>
        </div>
      </div>
    </div>
  );
}
