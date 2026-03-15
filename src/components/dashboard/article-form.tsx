
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ImageIcon, Type, Heading2, Loader2, Upload, MessageSquareText, Bold, Italic, List, Maximize, MoveHorizontal, MoveVertical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  
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
    content: article?.content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror outline-none min-h-[600px] p-8 md:p-12',
      },
    },
  });

  async function handleImageInsert(file: File) {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        editor?.chain().focus().setImage({ src: base64 }).run();
        toast({ title: "画像を本文に埋め込みました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
      setIsProcessing(false);
    }
  }

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

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in (e.target as any) && (e.target as any).files) {
      file = (e.target as any).files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        form.setValue("mainImageUrl", reader.result as string);
        toast({ title: "表紙画像を取り込みました" });
        setIsProcessing(false);
      };
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗" });
      setIsProcessing(false);
    }
  };

  function onSubmit(values: ArticleFormValues) {
    if (!firestore) return;
    const data = {
      ...values,
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
  }

  const mainImageUrl = form.watch("mainImageUrl");
  const transform = form.watch("mainImageTransform");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 max-w-5xl mx-auto pb-20">
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="border-b border-slate-100 pb-4">
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">記事見出し</FormLabel>
                <FormControl>
                  <Input 
                    className="h-auto py-4 text-3xl md:text-5xl font-black border-none bg-transparent shadow-none px-0 focus-visible:ring-0" 
                    placeholder="ここにタイトルを入力..."
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50">
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
                    <Input type="date" className="h-12 rounded-xl border-slate-100 bg-slate-50/50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> 本文執筆
            </span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="editor-image-upload" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageInsert(file);
                }}/>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => document.getElementById('editor-image-upload')?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-[600px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner relative">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="mainImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <ImageIcon className="h-3 w-3" /> 表紙画像
                    </FormLabel>
                    <div 
                      className={cn(
                        "relative h-48 md:h-64 rounded-[2rem] border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden",
                        isDraggingMain ? "border-primary bg-primary/5 scale-[0.98]" : "border-slate-200 bg-white hover:border-primary/50"
                      )}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
                      onDragLeave={() => setIsDraggingMain(false)}
                      onDrop={(e) => { e.preventDefault(); handleMainImageUpload(e as any); }}
                      onClick={() => mainImageInputRef.current?.click()}
                    >
                      {mainImageUrl ? (
                        <div className="relative w-full h-full">
                           <Image 
                            src={mainImageUrl} 
                            alt="" 
                            fill 
                            className="object-cover opacity-20"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="h-8 w-8 text-primary/40" />
                            <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">画像を入れ替える</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-50 p-6 rounded-full text-slate-300 group-hover:scale-110 transition-transform">
                            <Upload className="h-8 w-8" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-400">ファイルをドロップ</p>
                            <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">またはクリックして選択</p>
                          </div>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageUpload} />
                    </div>
                  </FormItem>
                )}
              />

              {mainImageUrl && (
                <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                   <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Maximize className="h-3 w-3" /> 画像構図管制
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500">倍率 (中央: 0%)</label>
                        <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                          {transform.scale.toFixed(0)}%
                        </span>
                      </div>
                      <Slider 
                        min={-200} 
                        max={200} 
                        step={0.1} 
                        value={[transform.scale]} 
                        onValueChange={([val]) => form.setValue("mainImageTransform.scale", val)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <MoveHorizontal className="h-3 w-3" /> 水平移動 (中央: 0)
                        </label>
                        <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.x.toFixed(0)}%</span>
                      </div>
                      <Slider 
                        min={-200} 
                        max={200} 
                        step={0.1} 
                        value={[transform.x]} 
                        onValueChange={([val]) => form.setValue("mainImageTransform.x", val)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <MoveVertical className="h-3 w-3" /> 垂直移動 (中央: 0)
                        </label>
                        <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.y.toFixed(0)}%</span>
                      </div>
                      <Slider 
                        min={-200} 
                        max={200} 
                        step={0.1} 
                        value={[transform.y]} 
                        onValueChange={([val]) => form.setValue("mainImageTransform.y", val)} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">仕上がりプレビュー</label>
                <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                  {mainImageUrl ? (
                    <div className="relative w-full h-full overflow-hidden">
                      <Image 
                        src={mainImageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-cover"
                        style={{
                          transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                          transition: 'transform 0.1s linear',
                          willChange: 'transform'
                        }}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-sm">画像が未選択です</div>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="imageCaption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <MessageSquareText className="h-3 w-3" /> 画像説明（キャプション）
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例：北海学園大学正門付近での撮影" className="h-12 rounded-xl border-slate-100 bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-3xl border-2 border-primary/10 p-6 bg-white">
                <div className="space-y-0.5">
                  <FormLabel className="text-lg font-black text-primary">公式サイトに公開</FormLabel>
                  <FormDescription className="text-[10px] font-bold">有効にすると即座に掲載されます。</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125" /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-10 border-t sticky bottom-6 z-20">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-32 h-14 rounded-2xl font-bold">キャンセル</Button>
          <Button type="submit" className="w-48 h-14 shadow-2xl font-black rounded-2xl text-lg bg-primary hover:bg-primary/90">
            内容を確定する
          </Button>
        </div>
      </form>
    </Form>
  );
}
