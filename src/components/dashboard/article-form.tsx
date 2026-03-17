
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
import { Image as LucideImage, Type, Heading2, Loader2, MessageSquareText, Bold, Italic, List, Maximize, RefreshCw, PlusCircle } from "lucide-react";
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
 * リサイズ可能な画像ノードビュー
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
        style={{ width: node.attrs.width || '100%', position: 'relative' }}
      >
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt} 
          title={node.attrs.title}
          style={{ width: '100%', height: 'auto' }}
        />
        
        {/* Resize Handle (Bottom Right) */}
        <div 
          className="resize-handle resize-handle-bottom-right" 
          onMouseDown={onMouseDown}
        />
      </div>
    </NodeViewWrapper>
  );
};

/**
 * リサイズ機能付き画像拡張
 */
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
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.literal("Standard"),
  content: z.string().min(1, "本文を入力してください"),
  imageCaption: z.string().optional().or(z.literal("")),
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
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  
  const editorRef = useRef<any>(null);

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || "",
      articleType: "Standard",
      content: article?.content || "",
      imageCaption: article?.imageCaption || "",
      categoryId: (article?.categoryId === "Viewer" ? "Campus" : article?.categoryId) || "Campus",
      publishDate: article?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: article?.mainImageUrl || "",
      mainImageTransform: article?.mainImageTransform || { scale: 0, x: 0, y: 0 },
      isPublished: article?.isPublished || false,
    },
  });

  const handleEditorImageInsert = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    // 即座にアップロードせず、Base64プレビューとして挿入
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editorRef.current?.chain().focus().setImage({ src: base64 }).run();
        toast({ title: "画像を一時挿入しました（保存時にクラウドへ送られます）" });
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
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  useEffect(() => {
    if (article?.mainImageUrl) {
      setMainImagePreview(article.mainImageUrl);
    }
  }, [article]);

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in (e.target as any) && (e.target as any).files) {
      file = (e.target as any).files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }
    if (!file || !file.type.startsWith('image/')) return;
    
    setMainImageFile(file);
    const preview = URL.createObjectURL(file);
    setMainImagePreview(preview);
  };

  /**
   * HTML内のBase64画像をCloudinaryにアップロードし、URLを置換する
   */
  const processEditorImages = async (html: string, folder: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));
    
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('data:image') || src.startsWith('blob:'))) {
        try {
          // Base64またはBlobからFileオブジェクトを擬似的に作成
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

      // 1. メイン画像のアップロード（変更があれば）
      if (mainImageFile) {
        const formData = new FormData();
        formData.append("file", mainImageFile);
        formData.append("folder", folderPath);
        
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("メイン画像のアップロードに失敗しました");
        const data = await res.json();
        finalMainImageUrl = data.secure_url;
      }

      // 2. 本文内の一括アップロードと置換
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
        
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="border-b-2 border-slate-100 pb-2">
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">記事見出し</FormLabel>
                <FormControl>
                  <Input 
                    className="h-auto py-4 text-3xl md:text-5xl font-black border-none bg-transparent shadow-none px-0 focus-visible:ring-0 placeholder:text-slate-200" 
                    placeholder="タイトルを入力してください"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div 
            className={cn(
              "relative aspect-[21/9] w-full rounded-[2.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden",
              isDraggingMain ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
            onDragLeave={() => setIsDraggingMain(false)}
            onDrop={(e) => { e.preventDefault(); handleMainImageSelect(e as any); }}
            onClick={() => mainImageInputRef.current?.click()}
          >
            {mainImagePreview ? (
              <div className="relative w-full h-full overflow-hidden">
                <Image 
                  src={mainImagePreview} 
                  alt="Hero Preview" 
                  fill 
                  className="object-cover"
                  style={{
                    transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                    transition: 'transform 0.1s linear',
                    willChange: 'transform'
                  }}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-10 w-10 text-white" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">画像を入れ替え</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-full shadow-sm text-slate-300 group-hover:scale-110 transition-transform">
                  <PlusCircle className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-400">見出し画像を設定</p>
                  <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">Drag & Drop or Click</p>
                </div>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageSelect} />
          </div>

          {mainImagePreview && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
              <div className="lg:col-span-2 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Maximize className="h-3 w-3" /> 画像構図の調整
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
              <FormField
                control={form.control}
                name="imageCaption"
                render={({ field }) => (
                  <FormItem className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquareText className="h-3 w-3" /> 画像の説明
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="キャプションを入力..." className="border-none bg-transparent shadow-none px-0 font-bold placeholder:text-slate-300 focus-visible:ring-0" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold">
                      <SelectValue />
                    </SelectTrigger>
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
                <FormControl>
                  <Input type="date" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> 本文執筆
            </span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="editor-image-upload" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleEditorImageInsert(file);
                }}/>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className={cn("h-8 px-3 rounded-lg gap-2 text-[10px] font-black", isProcessing && "bg-white shadow-sm")}
                  onClick={() => document.getElementById('editor-image-upload')?.click()} 
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <LucideImage className="h-3 w-3" />}
                  画像を挿入
                </Button>
              </div>
            </div>
          </div>
          
          <div className="min-h-[600px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner relative group/editor">
            <EditorContent editor={editor} />
            <div className="absolute top-4 right-4 opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
              <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-[9px] font-bold text-slate-400">画像は角をドラッグしてサイズ調整できます</Badge>
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
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-black text-slate-700">公式サイトに公開</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onSuccess} className="w-32 h-14 rounded-2xl font-bold border-slate-200">キャンセル</Button>
            <Button type="submit" disabled={isSaving} className="w-48 h-14 shadow-2xl font-black rounded-2xl text-lg bg-primary hover:bg-primary/90">
              {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
              {isSaving ? "転送・保存中" : "記事を保存する"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
