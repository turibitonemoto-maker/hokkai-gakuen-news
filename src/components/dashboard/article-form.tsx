
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
import { FileText, Share2, Tag, ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

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

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold", "italic", "underline", "strike",
  "list", "bullet",
  "link", "image",
];

export function ArticleForm({ article, onSuccess }: ArticleFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  
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

  const articleType = form.watch("articleType");
  const isNote = articleType === "Note";

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
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp() });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 max-w-5xl mx-auto">
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
                      placeholder="記事のタイトルを入力..." 
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
                    "h-12 flex items-center px-4 rounded-xl border font-black text-xs gap-2",
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
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
            <Type className="h-3 w-3" />
            本文 (Rich Editor)
          </div>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="min-h-[600px] bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <ReactQuill 
                      theme="snow"
                      value={field.value}
                      onChange={field.onChange}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      className="h-[550px]"
                      readOnly={isNote}
                      placeholder="さあ、物語を書きましょう..."
                    />
                  </div>
                </FormControl>
                {isNote && (
                  <FormDescription className="text-purple-600 font-bold text-[10px] mt-2">
                    ※ note同期記事の本文は note.com で編集してください。
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-6">
             <FormField
              control={form.control}
              name="mainImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <ImageIcon className="h-3 w-3" /> 表紙画像URL
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." className="h-12 rounded-xl border-slate-100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagsInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Tag className="h-3 w-3" /> タグ (カンマ区切り)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="学園祭, サークル, 特集" className="h-12 rounded-xl border-slate-100" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-primary/10 p-6 bg-primary/5">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-black text-primary">公式サイトに公開</FormLabel>
                    <FormDescription className="text-[10px] font-bold opacity-60">オンにすると即座に読者へ届きます。</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="scale-125"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-10 border-t bg-white/90 backdrop-blur-md sticky bottom-0 pb-6 z-20">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-full md:w-32 h-12 rounded-xl font-bold">破棄</Button>
          <Button type="submit" className="w-full md:w-48 h-12 shadow-xl font-black rounded-xl text-lg bg-primary hover:bg-primary/90">
            {article?.id ? "変更を公開" : "記事を創出"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
