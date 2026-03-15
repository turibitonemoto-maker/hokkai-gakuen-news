
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser, useFirebase } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { FileText, Share2, Tag, ImageIcon, Type, Heading1, Heading2, List, Link as LinkIcon, Bold, Italic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.enum(["Standard", "Note"]),
  content: z.string().min(1, "本文を入力してください"),
  noteUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
  tagsInput: z.string().optional(),
  publishDate: z.string(),
  mainImageUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
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
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || "",
      articleType: article?.articleType || "Standard",
      content: article?.content || "",
      noteUrl: article?.noteUrl || "",
      categoryId: article?.categoryId || "Campus",
      tagsInput: article?.tags?.join(", ") || "",
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
          class: 'rounded-2xl shadow-lg my-8 mx-auto max-w-full h-auto',
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
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[600px] p-8 md:p-12 prose-p:leading-7 prose-p:my-4',
      },
    },
  });

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor || !firebaseApp) return;

    setIsUploading(true);
    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `articles/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      editor.chain().focus().setImage({ src: url }).run();
      toast({ title: "画像を挿入しました", description: "Storageへのアップロードが完了しました。" });
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({ variant: "destructive", title: "アップロードエラー", description: "Firebase Storageへのアクセスに失敗しました。リージョン設定やルールを確認してください。" });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  }, [editor, firebaseApp, toast]);

  function onSubmit(values: ArticleFormValues) {
    if (!firestore) return;

    const tags = values.tagsInput 
      ? values.tagsInput.split(",").map(t => t.trim()).filter(t => t !== "") 
      : [];

    const { tagsInput, ...rest } = values;
    const data = {
      ...rest,
      tags,
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    };

    if (article?.id) {
      const docRef = doc(firestore, "articles", article.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({ title: "更新しました", description: "記事の変更を保存しました。" });
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp() });
      toast({ title: "作成しました", description: "新しい記事を公開管理に追加しました。" });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 max-w-5xl mx-auto pb-20">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-slate-100 pb-10">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">見出し / タイトル</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="" 
                      className="h-auto py-4 text-3xl md:text-5xl font-black border-none bg-transparent shadow-none px-0 focus-visible:ring-0 placeholder:opacity-20" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">カテゴリー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50">
                        <SelectValue placeholder="選択" />
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
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">公開日</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="articleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイプ</FormLabel>
                  <div className={cn(
                    "h-12 flex items-center px-4 rounded-xl border font-black text-xs gap-2 transition-colors",
                    field.value === "Note" ? "bg-purple-50 border-purple-100 text-purple-700" : "bg-blue-50 border-blue-100 text-primary"
                  )}>
                    {field.value === "Note" ? <Share2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {field.value === "Note" ? "note同期記事" : "学内オリジナル記事"}
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
            <div className="flex items-center gap-2">
              <Type className="h-3 w-3" />
              本文執筆 (note風エディタ)
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bold') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('italic') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading', { level: 1 }) && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('heading', { level: 2 }) && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor?.isActive('bulletList') && "bg-slate-100")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
              <div className="relative">
                <input type="file" accept="image/*" className="hidden" id="tiptap-image-upload" onChange={handleImageUpload}/>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('tiptap-image-upload')?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-[600px] bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-inner">
            <EditorContent editor={editor} className="outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <FormField
            control={form.control}
            name="mainImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><ImageIcon className="h-3 w-3" /> 表紙画像URL</FormLabel>
                <FormControl><Input placeholder="" className="h-12 rounded-xl border-slate-100 bg-slate-50/30" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-3xl border-2 border-primary/10 p-8 bg-primary/5 transition-all hover:border-primary/20">
                <div className="space-y-1">
                  <FormLabel className="text-xl font-black text-primary">公式サイトに公開</FormLabel>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-150" /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-10 border-t bg-white/95 backdrop-blur-md sticky bottom-0 pb-6 z-20">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-full md:w-32 h-14 rounded-2xl font-bold">破棄</Button>
          <Button type="submit" className="w-full md:w-48 h-14 shadow-2xl font-black rounded-2xl text-lg bg-primary hover:bg-primary/90 transform hover:scale-[1.02] transition-all">
            {article?.id ? "変更を公開" : "記事を創出"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
