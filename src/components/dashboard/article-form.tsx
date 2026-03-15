
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
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { FileText, ImageIcon, Type, Heading2, Loader2, Upload, FileType, ShieldCheck, MessageSquareText, Bold, Italic, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.literal("Standard"),
  content: z.string().min(1, "本文を入力してください"),
  imageCaption: z.string().optional().or(z.literal("")),
  pdfUrl: z.string().optional().or(z.literal("")),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
  publishDate: z.string(),
  mainImageUrl: z.string().optional().or(z.literal("")),
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
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || "",
      articleType: "Standard",
      content: article?.content || "",
      imageCaption: article?.imageCaption || "",
      pdfUrl: article?.pdfUrl || "",
      categoryId: article?.categoryId || "Campus",
      publishDate: article?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: article?.mainImageUrl || "",
      isPublished: article?.isPublished || false,
    },
  });

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

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const base64 = await convertToBase64(file);
      form.setValue("mainImageUrl", base64);
      toast({ title: "表紙画像を取り込みました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setIsProcessing(true);
    try {
      const base64 = await convertToBase64(file);
      editor.chain().focus().setImage({ src: base64 }).run();
      toast({ title: "画像を本文に埋め込みました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: "画像の処理に失敗しました。" });
    } finally {
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
                      <SelectItem value="Campus">学内ニュース</SelectItem>
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

          <FormField
            control={form.control}
            name="pdfUrl"
            render={({ field }) => (
              <FormItem className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <FileType className="h-4 w-4 text-primary" /> 新聞紙面PDF (Googleドライブ共有リンク)
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://drive.google.com/file/d/..." className="h-12 rounded-xl border-slate-200 bg-white" {...field} />
                </FormControl>
                <FormDescription className="text-[10px] font-bold mt-2">
                  共有リンクをそのまま貼り付けてください。自動でビューアー形式へ変換されます。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Type className="h-3 w-3" /> 本文執筆（人力入魂）
            </span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bold') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('italic') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('heading', { level: 2 }) && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", editor?.isActive('bulletList') && "bg-white shadow-sm")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="editor-image-upload" onChange={handleEditorImageUpload}/>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => document.getElementById('editor-image-upload')?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-[600px] bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="mainImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <ImageIcon className="h-3 w-3" /> 表紙画像 (Base64)
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="ファイルを選択してください" className="h-12 rounded-xl border-slate-100 bg-white flex-1" {...field} readOnly />
                    </FormControl>
                    <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageUpload} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-6 rounded-xl gap-2 font-bold bg-white"
                      onClick={() => mainImageInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      選択
                    </Button>
                  </div>
                </FormItem>
              )}
            />
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
          
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-primary/10 p-6 bg-white">
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
