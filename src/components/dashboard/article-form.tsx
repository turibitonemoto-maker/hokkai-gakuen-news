"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { FileText, Share2, Tag, Layout, AlignLeft, Lock } from "lucide-react";
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
          <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
            <Layout className="h-5 w-5" />
            <h3>記事の基本情報</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="articleType"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    記事タイプ
                    {article?.id && <Lock className="h-3 w-3" />}
                  </FormLabel>
                  {article?.id ? (
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border font-bold text-sm",
                      field.value === "Note" 
                        ? "bg-purple-50 border-purple-200 text-purple-700" 
                        : "bg-blue-50 border-blue-200 text-primary"
                    )}>
                      {field.value === "Note" ? (
                        <>
                          <Share2 className="h-4 w-4" />
                          note記事（採用済みのため変更不可）
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          学内記事（作成済みのため変更不可）
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
                      <TabsList className="grid w-full grid-cols-2 h-12">
                        <TabsTrigger value="Standard" className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                          <FileText className="h-4 w-4" />
                          学内記事
                        </TabsTrigger>
                        <TabsTrigger value="Note" className="flex items-center gap-2 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
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
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input placeholder="記事のタイトルを入力" className="h-11 font-bold text-lg" {...field} />
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
                  <FormLabel>カテゴリー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリーを選択" />
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>公開日（表示用）</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    タグ（カンマ区切り）
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 新入生, サークル, 特集" {...field} />
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
                  <FormLabel>メイン画像URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <FormDescription>画像がない場合は空白でも構いません。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {articleType === "Note" && (
              <FormField
                control={form.control}
                name="noteUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <FormLabel className="text-purple-700 font-bold flex items-center gap-2">
                      <Share2 className="h-4 w-4" /> note原文へのリンクURL
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://note.com/..." className="bg-white border-purple-200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
            <AlignLeft className="h-5 w-5" />
            <h3>本文・紹介文</h3>
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {articleType === "Standard" ? "学内記事の本文" : "note記事の紹介文"}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={articleType === "Standard" ? "記事の本文を入力してください..." : "note記事の内容を要約した紹介文を入力してください。"} 
                    className="min-h-[400px] text-base leading-relaxed p-6 shadow-inner bg-slate-50 focus:bg-white transition-colors" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  改行はそのまま反映されます。HTMLタグは使用できません。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-primary/20 p-6 bg-primary/5 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-bold text-primary">公式サイトに公開する</FormLabel>
                  <FormDescription>
                    オンにすると公式サイトのリストに表示されます。
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t sticky bottom-0 bg-white/80 backdrop-blur-md pb-4 z-10">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-32">キャンセル</Button>
          <Button type="submit" className={cn(
            "w-48 shadow-lg font-bold",
            articleType === "Note" ? "bg-purple-600 hover:bg-purple-700" : ""
          )}>
            {article?.id ? "変更を保存" : "記事を登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
