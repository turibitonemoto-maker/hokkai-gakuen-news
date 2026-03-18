
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
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

/**
 * note風：画像サイズ選択 ＆ キャプション機能付きコンポーネント
 */
const NoteImageComponent = ({ node, updateAttributes, selected }: any) => {
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
        
        {/* Note-like Size Toolbar */}
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

interface ArticleFormProps {
  article?: any;
  onSuccess: () => void;
}

export function ArticleForm({ article, onSuccess }: ArticleFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

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

  useEffect(() => {
    if (mainImagePreview && !article?.mainImageUrl) {
      form.setValue("mainImageTransform", { scale: 0, x: 0, y: 0 });
    }
  }, [mainImagePreview, form, article]);

  const handleEditorImageInsert = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editorRef.current?.chain().focus().setImage({ src: base64 }).run();
        toast({ title: "画像を挿入しました" });
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({ variant: "destructive", title: "画像プレビューに失敗しました" });
      setIsProcessing(false);
    }
  }, [toast]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomResizableImage,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary font-bold underline',
        },
      }),
    ],
    content: article?.content || "",
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[600px] py-10 px-0 max-w-3xl mx-auto',
      },
    },
  });

  const charCount = useMemo(() => {
    if (!editor) return 0;
    return editor.getText().length;
  }, [editor?.getText()]);

  useEffect(() => {
    if (article?.mainImageUrl) {
      setMainImagePreview(article.mainImageUrl);
    }
  }, [article]);

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setMainImageFile(file);
    const preview = URL.createObjectURL(file);
    setMainImagePreview(preview);
  };

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  const processEditorImages = async (html: string, folder: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('data:image') || src.startsWith('blob:'))) {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const file = new File([blob], "editor_image.jpg", { type: blob.type });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("本文画像のアップロードに失敗しました");
          const data = await res.json();
          img.setAttribute('src', data.secure_url);
        } catch (e) {
          console.error("Image upload failed:", e);
        }
      }
    }
    return doc.body.innerHTML;
  };

  async function onSubmit(values: ArticleFormValues) {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const subFolder = sanitizeFolderName(values.title);
      const folderPath = `newspaper_archive/${subFolder}`;
      let finalMainImageUrl = values.mainImageUrl;
      if (mainImageFile) {
        const formData = new FormData();
        formData.append("file", mainImageFile);
        formData.append("folder", folderPath);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("メイン画像のアップロードに失敗しました");
        const data = await res.json();
        finalMainImageUrl = data.secure_url;
      }
      const processedContent = await processEditorImages(values.content, folderPath);
      const data = {
        ...values,
        content: processedContent,
        mainImageUrl: finalMainImageUrl,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "unknown"
      };
      if (article?.id) {
        const docRef = doc(firestore, "articles", article.id);
        setDocumentNonBlocking(docRef, data, { merge: true });
        toast({ title: "保存しました" });
      } else {
        const colRef = collection(firestore, "articles");
        addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
        toast({ title: "保存しました" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存に失敗しました", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  const transform = form.watch("mainImageTransform");

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
      {/* Header - Fixed & Clean */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b h-14 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={onSuccess} className="rounded-full">
          <ArrowLeft className="h-6 w-6 text-slate-600" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Form {...form}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-black text-slate-700 h-9 px-4 rounded-full hover:bg-slate-100 transition-all">
                  公開設定
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] max-w-sm p-6 rounded-3xl shadow-2xl border-none" align="end" sideOffset={10}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg">記事の公開設定</h3>
                    <Badge variant="outline" className="text-[10px] font-black uppercase">Admin Only</Badge>
                  </div>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"><SelectValue /></SelectTrigger>
                          </FormControl>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="publishDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">公開日</FormLabel>
                        <FormControl><Input type="date" className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 bg-slate-50/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-black">公式サイトに公開</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    onClick={form.handleSubmit(onSubmit)} 
                    disabled={isSaving} 
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                    保存する
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </Form>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="h-5 w-5 text-slate-400" />
          </Button>
        </div>
      </header>

      {/* Main canvas - Note-like Immersive Experience */}
      <main className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-20">
          {/* Header Image Area */}
          <div className="mb-12 group relative">
            <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />
            {mainImagePreview ? (
              <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-50">
                <Image 
                  src={mainImagePreview} 
                  alt="" 
                  fill 
                  className="object-contain transition-transform duration-100"
                  style={{
                    transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`,
                  }}
                  unoptimized
                />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="icon" className="rounded-full shadow-lg bg-white/90 backdrop-blur-md" onClick={() => mainImageInputRef.current?.click()}><RefreshCw className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="icon" className="rounded-full shadow-lg" onClick={() => { setMainImagePreview(""); setMainImageFile(null); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div 
                className="w-full aspect-[21/9] rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-primary/20 transition-all group"
                onClick={() => mainImageInputRef.current?.click()}
              >
                <div className="p-4 bg-white rounded-full shadow-sm text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all">
                  <LucideImage className="h-8 w-8" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">見出し画像を追加</p>
              </div>
            )}
          </div>

          {/* Title Area */}
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

          {/* Editor Area */}
          <div className="mt-8">
            {editor && (
              <div className="prose-container relative">
                {!editor.getText() && !editor.isActive('image') && <p className="absolute top-10 left-0 text-slate-200 font-bold pointer-events-none text-xl">ご自由にお書きください。</p>}
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Toolbar - Note-like Mobile Optimized */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Character Count Bar */}
          <div className="px-6 py-1.5 flex justify-end">
            <div className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1.5 shadow-sm">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              {charCount.toLocaleString()} 文字
            </div>
          </div>

          <div className="h-16 flex items-center px-2 overflow-x-auto gap-1 no-scrollbar pb-safe-area-inset-bottom">
            {/* The Plus button - Front & Center */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0 text-white bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/20 ml-2 group active:scale-90 transition-all">
                  <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-300" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-56 p-2 rounded-3xl shadow-2xl border-none mb-2 animate-in slide-in-from-bottom-4 zoom-in-95">
                <div className="grid gap-1">
                  <button 
                    type="button"
                    onClick={() => document.getElementById('editor-image-insert')?.click()}
                    className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group"
                  >
                    <div className="bg-blue-50 p-2 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <LucideImage className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-black text-slate-700">画像を挿入</span>
                  </button>
                  <input type="file" id="editor-image-insert" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEditorImageInsert(file); }} />
                  
                  <button 
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group"
                  >
                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-slate-100 transition-colors">
                      <Heading2 className="h-5 w-5 text-slate-500" />
                    </div>
                    <span className="text-sm font-black text-slate-700">大見出し</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 rounded-2xl text-left transition-all group"
                  >
                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-slate-100 transition-colors">
                      <Heading3 className="h-5 w-5 text-slate-500" />
                    </div>
                    <span className="text-sm font-black text-slate-700">小見出し</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-8 mx-2 bg-slate-100" />

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 shrink-0 rounded-xl transition-all", editor?.isActive('bold') ? "text-primary bg-primary/5 shadow-inner" : "text-slate-400")} 
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 shrink-0 rounded-xl transition-all", editor?.isActive({ textAlign: 'center' }) ? "text-primary bg-primary/5" : "text-slate-400")} 
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              >
                <AlignCenter className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 shrink-0 rounded-xl transition-all", editor?.isActive('bulletList') ? "text-primary bg-primary/5" : "text-slate-400")} 
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <List className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 shrink-0 rounded-xl transition-all", editor?.isActive('link') ? "text-primary bg-primary/5" : "text-slate-400")} 
                onClick={setLink}
              >
                <LinkIcon className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-11 w-11 shrink-0 rounded-xl transition-all", editor?.isActive('blockquote') ? "text-primary bg-primary/5" : "text-slate-400")} 
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
