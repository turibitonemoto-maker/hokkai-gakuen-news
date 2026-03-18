
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
  RefreshCw, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  Heading3,
  ArrowLeft,
  MoreVertical,
  AlignCenter,
  Quote,
  Sparkles
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
 * 本文内：リサイズ ＆ キャプション機能付き画像コンポーネント
 */
const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);

    const startX = event.clientX;
    const startWidth = containerRef.current?.offsetWidth || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diffX = currentX - startX;
      const newWidth = Math.max(100, startWidth + diffX);
      updateAttributes({ width: `${newWidth}px` });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className={cn("resizable-image-container", selected && "is-selected")}>
      <div 
        ref={containerRef}
        className="mx-auto"
        style={{ width: node.attrs.width || '60%', position: 'relative' }}
      >
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt} 
          style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
        />
        <div 
          className="resize-handle resize-handle-bottom-right" 
          onMouseDown={onMouseDown}
        />
      </div>

      <input
        type="text"
        placeholder="キャプションを入力..."
        value={node.attrs.caption || ''}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className="w-full mt-2 text-center text-sm font-bold text-slate-400 bg-transparent outline-none border-none placeholder:text-slate-200"
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
    return ReactNodeViewRenderer(ResizableImageComponent);
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
    if (mainImagePreview) {
      form.setValue("mainImageTransform", { scale: 0, x: 0, y: 0 });
    }
  }, [mainImagePreview, form]);

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
        class: 'ProseMirror outline-none min-h-[600px] py-10 px-4 md:px-0 max-w-3xl mx-auto',
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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b h-14 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={onSuccess} className="rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="h-5 w-5" />
          </Button>
          <Form {...form}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-bold text-slate-700">公開設定</Button>
              </PopoverTrigger>
              <PopoverContent className="w-[90vw] max-w-sm p-6 rounded-3xl shadow-2xl border-none" align="end" sideOffset={10}>
                <div className="space-y-6">
                  <h3 className="font-black text-lg">記事の公開設定</h3>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-slate-50/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold">公式サイトに公開</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    onClick={form.handleSubmit(onSubmit)} 
                    disabled={isSaving} 
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    保存する
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </Form>
        </div>
      </header>

      {/* Main canvas */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header Image Upload Area */}
          <div className="mb-10 group relative">
            <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />
            {mainImagePreview ? (
              <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-50">
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
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={() => mainImageInputRef.current?.click()}><RefreshCw className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="icon" className="rounded-full shadow-lg" onClick={() => { setMainImagePreview(""); setMainImageFile(null); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                className="h-14 w-14 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all p-0 flex items-center justify-center"
                onClick={() => mainImageInputRef.current?.click()}
              >
                <LucideImage className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Title Area */}
          <textarea
            className="w-full text-4xl md:text-5xl font-black border-none focus:ring-0 resize-none px-0 py-2 leading-tight placeholder:text-slate-200 bg-transparent min-h-[100px]"
            placeholder="記事タイトル"
            rows={2}
            value={form.watch("title")}
            onChange={(e) => form.setValue("title", e.target.value)}
          />

          {/* Editor Area */}
          <div className="mt-4">
            {editor && (
              <div className="prose-container relative">
                {!editor.getText() && <p className="absolute top-10 left-4 text-slate-300 font-bold pointer-events-none">ご自由にお書きください。</p>}
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t z-50">
        <div className="max-w-3xl mx-auto">
          <div className="px-4 py-1 flex justify-end">
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{charCount} 文字</span>
          </div>
          <div className="h-14 flex items-center px-2 overflow-x-auto gap-1 no-scrollbar">
            {/* The Plus button is front and center (far left) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-slate-600 hover:text-primary rounded-xl">
                  <Plus className="h-6 w-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 p-2 rounded-2xl shadow-2xl border-none">
                <div className="grid gap-1">
                  <button 
                    onClick={() => document.getElementById('editor-image-insert')?.click()}
                    className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl text-left transition-colors group"
                  >
                    <LucideImage className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                    <span className="text-xs font-black text-slate-600">画像を挿入</span>
                  </button>
                  <input type="file" id="editor-image-insert" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEditorImageInsert(file); }} />
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl text-left transition-colors"
                  >
                    <Heading2 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-black text-slate-600">大見出し</span>
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl text-left transition-colors"
                  >
                    <Heading3 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-black text-slate-600">小見出し</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-slate-300 rounded-xl"><Sparkles className="h-5 w-5" /></Button>
            
            <Separator orientation="vertical" className="h-6 mx-1" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-10 px-3 shrink-0 text-sm font-black text-slate-600 rounded-xl">見出し <Plus className="ml-1 h-3 w-3 opacity-50" /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-32 p-1 rounded-xl shadow-xl border-none">
                <Button variant="ghost" className="w-full justify-start font-bold" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>大見出し</Button>
                <Button variant="ghost" className="w-full justify-start font-bold" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>小見出し</Button>
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 shrink-0 rounded-xl", editor?.isActive('bold') && "text-primary bg-primary/5")} 
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-slate-600 rounded-xl"><AlignCenter className="h-5 w-5" /></Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 shrink-0 rounded-xl", editor?.isActive('bulletList') && "text-primary bg-primary/5")} 
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-5 w-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 shrink-0 rounded-xl", editor?.isActive('link') && "text-primary bg-primary/5")} 
              onClick={setLink}
            >
              <LinkIcon className="h-5 w-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 shrink-0 rounded-xl", editor?.isActive('blockquote') && "text-primary bg-primary/5")} 
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-safe-area-inset-bottom" />
        </div>
      </div>
    </div>
  );
}
