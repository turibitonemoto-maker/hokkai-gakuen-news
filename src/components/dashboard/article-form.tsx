
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
import { FileText, Share2, Tag } from "lucide-react";

const articleSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  articleType: z.enum(["Standard", "Note"]),
  content: z.string().optional(),
  noteUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  categoryId: z.enum(["Campus", "Event", "Interview", "Sports", "Column", "Opinion"]),
  tagsInput: z.string().optional(), // 入力用
  publishDate: z.string(),
  mainImageUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
}).refine((data) => {
  if (data.articleType === "Standard" && !data.content) return false;
  if (data.articleType === "Note" && !data.noteUrl) return false;
  return true;
}, {
  message: "タイプに応じた内容を入力してください",
  path: ["content"]
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

    // タグを配列に変換
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="articleType"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>記事のタイプ</FormLabel>
                <Tabs 
                  onValueChange={field.onChange} 
                  defaultValue={field.value} 
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="Standard" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      標準記事（学内）
                    </TabsTrigger>
                    <TabsTrigger value="Note" className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      note連携記事
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <FormDescription>
                  {articleType === "Standard" 
                    ? "このサイトのデータベースに保存される通常の記事です。" 
                    : "外部のnote記事へ誘導するリンク記事です。"}
                </FormDescription>
                <FormMessage />
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
                <FormDescription>
                  複数のタグを設定する場合はカンマ（ , ）で区切ってください。
                </FormDescription>
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
                  アイキャッチ画像として使用されます。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {articleType === "Standard" ? (
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>本文（標準記事）</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="原稿をここに貼り付けてください..." 
                      className="min-h-[400px] text-base leading-relaxed resize-y" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="noteUrl"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>note記事URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://note.com/your_account/n/..." {...field} />
                  </FormControl>
                  <FormDescription>
                    クリックした際に遷移するnote記事のURLを入力してください。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">公開状態</FormLabel>
                  <FormDescription>
                    オフにすると公式サイトには表示されません。
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
          <Button type="submit" className="px-8">
            {article?.id ? "変更を保存" : "記事を登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
