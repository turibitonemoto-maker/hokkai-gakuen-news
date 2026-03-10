
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
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  content: z.string().min(1, "本文を入力してください"),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
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
      content: article?.content || article?.htmlContent || "", // 互換性のために htmlContent も考慮
      categoryId: article?.categoryId || "Campus",
      publishDate: article?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: article?.mainImageUrl || "",
      isPublished: article?.isPublished || false,
    },
  });

  function onSubmit(values: ArticleFormValues) {
    if (!firestore) return;

    if (article?.id) {
      const docRef = doc(firestore, "articles", article.id);
      setDocumentNonBlocking(docRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...values, createdAt: serverTimestamp() });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>タイトル</FormLabel>
                <FormControl>
                  <Input placeholder="記事のタイトルを入力" {...field} />
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
                <FormLabel>公開日</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormDescription>
                  Unsplashなどの画像URLをここに貼り付けてください。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>本文</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="原稿をここに貼り付けてください。改行はそのまま保存されます。" 
                    className="min-h-[400px] text-base leading-relaxed resize-y" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  HTMLタグを入力する必要はありません。テキストをそのまま入力してください。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">すぐに公開する</FormLabel>
                  <FormDescription>
                    オフにすると「下書き」として保存されます。
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

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>キャンセル</Button>
          <Button type="submit" className="px-8">記事を保存する</Button>
        </div>
      </form>
    </Form>
  );
}
