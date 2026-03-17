
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
import { Image as LucideImage, Type, Heading2, Loader2, Bold, Italic, List, Maximize, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

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
        style={{ width: node.attrs.width || '100%', position: 'relative' }}
      >
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt} 
          style={{ width: '100%', height: 'auto' }}
        />
        
        {/* Resize Handle */}
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
        default: '100%',
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
  imageCaption: z.string().optional(),
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
      imageCaption: "",
      categoryId: (article?.categoryId === "Viewer" ? "Campus" : article?.categoryId) || "Campus",
      publishDate: article?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: article?.mainImageUrl || "",
      mainImageTransform: article?.mainImageTransform || { scale: 0, x: 0, y: 0 },
      isPublished: article?.isPublished || false,
    },
  });

  // 画像変更時に座標を完全に初期化（強制リセット）
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
        toast({ title: "画像を一時挿入しました" });
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
        class: 'ProseMirror outline-none min-h-[600px] p-8 md:p-12',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleEditorImageInsert(file);
            return true;
          }
        }
        return false;
      },
    },
  });

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
        toast({ title: "記事を更新しました" });
      } else {
        const colRef = collection(firestore, "articles");
        addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
        toast({ title: "記事を作成しました" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "保存に失敗しました", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  const transform = form.watch("mainImageTransform");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-start gap-4 md:gap-6 border-b-2 border-slate-100 pb-6 group/title">
          <div className="relative pt-4">
            <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />
            <Button 
              type="button" 
              variant="ghost" 
              className={cn(
                "h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all shrink-0",
                mainImagePreview ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100"
              )}
              onClick={() => mainImageInputRef.current?.click()}
            >
              {mainImagePreview ? <RefreshCw className="h-6 w-6" /> : <LucideImage className="h-6 w-6" />}
              <span className="text-[8px] font-black uppercase tracking-tighter">Header</span>
            </Button>
            {mainImagePreview && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-lg scale-0 group-hover/title:scale-100 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setMainImagePreview("");
                  setMainImageFile(null);
                  form.setValue("mainImageUrl", "");
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">記事見出し</FormLabel>
                  <FormControl>
                    <Input className="h-auto py-2 text-3xl md:text-5xl font-black border-none bg-transparent shadow-none px-0 focus-visible:ring-0 placeholder:text-slate-200 leading-tight" placeholder="タイトルを入力してください" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {mainImagePreview && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative aspect-[21/9] w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-100">
              <div 
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
              >
                <Image 
                  src={mainImagePreview} 
                  alt="Header Preview" 
                  fill 
                  className="transition-transform duration-100 ease-linear"
                  style={{
                    // 座標整合性プロトコル：translate(相対%) → scale の順序で計算
                    // object-fit: contain 状態から開始し、はみ出しを防ぐ
                    objectFit: "contain",
                    transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`,
                    willChange: 'transform'
                  }}
                  unoptimized
                />
              </div>
              <div className="absolute top-4 right-4 pointer-events-none">
                <Badge className="bg-black/60 backdrop-blur-md border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">Header Preview</Badge>
              </div>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Maximize className="h-3 w-3" /> 見出し画像の構図を調整
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500">ズーム: {transform.scale.toFixed(0)}%</label>
                  <Slider min={-200} max={200} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("mainImageTransform.scale", val)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500">水平位置: {transform.x.toFixed(0)}%</label>
                  <Slider min={-200} max={200} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("mainImageTransform.x", val)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500">垂直位置: {transform.y.toFixed(0)}%</label>
                  <Slider min={-200} max={200} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("mainImageTransform.y", val)} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold"><SelectValue /></SelectTrigger>
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
                <FormControl><Input type="date" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Type className="h-3 w-3" /> 本文執筆</span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="editor-image-upload" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEditorImageInsert(file); }}/>
                <Button type="button" variant="ghost" className={cn("h-8 px-3 rounded-lg gap-2 text-[10px] font-black", isProcessing && "bg-white shadow-sm")} onClick={() => document.getElementById('editor-image-upload')?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <LucideImage className="h-3 w-3" />}画像を挿入
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-[600px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner relative group/editor">
            <EditorContent editor={editor} />
            <div className="absolute top-4 right-4 opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
              <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-[9px] font-bold text-slate-400">画像は角をドラッグしてサイズ調整、下に説明を入力できます</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t sticky bottom-6 z-20 bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border border-white">
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-4 space-y-0">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-110" /></FormControl>
                <FormLabel className="text-sm font-black text-slate-700">公式サイトに公開</FormLabel>
              </FormItem>
            )}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onSuccess} className="w-32 h-14 rounded-2xl font-bold border-slate-200">キャンセル</Button>
            <Button type="submit" disabled={isSaving} className="w-48 h-14 shadow-2xl font-black rounded-2xl text-lg bg-primary hover:bg-primary/90">
              {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}{isSaving ? "転送・保存中" : "記事を保存する"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
