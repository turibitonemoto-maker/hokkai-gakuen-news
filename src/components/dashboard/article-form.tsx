"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { FileText, Share2, Tag, Layout, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.enum(["Standard", "Note"]),
  content: z.string().optional(),
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-primary font-black border-b pb-2 uppercase tracking-widest text-xs">
            <Layout className="h-4 w-4" />
            <h3>記事の基本情報</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="articleType"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    記事タイプ
                  </FormLabel>
                  {article?.id ? (
                    <div className={cn(
                      "flex items-center gap-3 px-5 py-4 rounded-2xl border font-black text-sm shadow-sm",
                      field.value === "Note" 
                        ? "bg-purple-50 border-purple-200 text-purple-700" 
                        : "bg-blue-50 border-blue-200 text-primary"
                    )}>
                      {field.value === "Note" ? (
                        <>
                          <Share2 className="h-4 w-4" />
                          note記事
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          学内記事
                        </>
                      )}
                      <input type="hidden" {...field} />
                    </div>
                  ) : (
                    <Tabs 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                        <TabsTrigger value="Standard" className="flex items-center gap-2 font-black rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg">
                          <FileText className="h-4 w-4" />
                          学内記事
                        </TabsTrigger>
                        <TabsTrigger value="Note" className="flex items-center gap-2 font-black rounded-xl transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                          <Share2 className="h-4 w-4" />
                          note記事
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</FormLabel>
                  <FormControl>
                    <Input placeholder="" className="h-12 md:h-14 font-black text-lg md:text-xl rounded-2xl border-slate-200 shadow-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">カテゴリー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 md:h-14 rounded-2xl font-bold border-slate-200">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Campus">学内ニュース</SelectItem>
                      <SelectItem value="Event">イベント</SelectItem>
                      <SelectItem value="Interview">インタビュー</SelectItem>
                      <SelectItem value="Sports">スポーツ</SelectItem>
                      <SelectItem value="Column">コラム</SelectItem>
                      <SelectItem value="Opinion">オピニオン</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
                    <Input type="date" className="h-12 md:h-14 rounded-2xl font-bold border-slate-200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagsInput"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    <Tag className="h-3 w-3" />
                    タグ（カンマ区切り）
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 新入生, サークル, 特集" className="h-12 md:h-14 rounded-2xl font-bold border-slate-200 shadow-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainImageUrl"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">画像URL</FormLabel>
                  <FormControl>
                    <Input placeholder="" className="h-12 md:h-14 rounded-2xl font-bold border-slate-200 shadow-sm" {...field} />
                  </FormControl>
                  <FormDescription className="text-[9px] font-bold">空欄でも構いません。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {articleType === "Note" && (
              <FormField
                control={form.control}
                name="noteUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 bg-purple-50 p-5 rounded-[2rem] border border-purple-100 shadow-inner">
                    <FormLabel className="text-purple-700 font-black flex items-center gap-2 uppercase tracking-widest text-[10px] mb-2">
                      <Share2 className="h-4 w-4" /> note原文リンク
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="" className="bg-white border-purple-200 h-12 md:h-14 rounded-2xl font-bold" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-primary font-black border-b pb-2 uppercase tracking-widest text-xs">
            <AlignLeft className="h-4 w-4" />
            <h3>本文・紹介文</h3>
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {isNote ? "紹介文（編集不可）" : "本文"}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={isNote ? "noteから取得した概要" : "記事の内容を入力してください..."} 
                    className="min-h-[400px] text-lg leading-relaxed p-6 md:p-10 rounded-[2rem] border-slate-200 bg-slate-50 focus:bg-white transition-colors shadow-inner" 
                    readOnly={isNote}
                    {...field} 
                  />
                </FormControl>
                {isNote && (
                  <FormDescription className="text-purple-600 font-black text-[10px] bg-purple-50 px-3 py-1 rounded-full w-fit mt-2">
                    ※ 本文は note.com で編集してください
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-[2rem] border border-primary/20 p-6 md:p-8 bg-primary/5 shadow-md">
                <div className="space-y-1">
                  <FormLabel className="text-lg font-black text-primary">公式サイトに公開</FormLabel>
                  <FormDescription className="text-xs font-bold opacity-60">
                    オンにすると即座に公開されます。
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="scale-125 md:scale-150"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white/95 backdrop-blur-md pb-6 z-10">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-full md:w-32 h-12 rounded-xl font-bold">キャンセル</Button>
          <Button type="submit" className={cn(
            "w-full md:w-48 h-12 shadow-xl font-black rounded-xl text-lg",
            isNote ? "bg-purple-600 hover:bg-purple-700" : ""
          )}>
            {article?.id ? "変更を保存" : "記事を登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}