
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

const adSchema = z.object({
  title: z.string().min(1, "広告名を入力してください"),
  imageUrl: z.string().url("有効な画像URLを入力してください"),
  linkUrl: z.string().url("有効な遷移先URLを入力してください"),
});

type AdFormValues = z.infer<typeof adSchema>;

interface AdFormProps {
  ad?: any;
  onSuccess: () => void;
}

export function AdForm({ ad, onSuccess }: AdFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: ad?.title || "",
      imageUrl: ad?.imageUrl || "",
      linkUrl: ad?.linkUrl || "",
    },
  });

  function onSubmit(values: AdFormValues) {
    if (!firestore) return;

    if (ad?.id) {
      const docRef = doc(firestore, "ads", ad.id);
      // 既存の閲覧数を保持するように更新
      setDocumentNonBlocking(docRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "更新しました", description: "広告情報を更新しました。" });
    } else {
      const colRef = collection(firestore, "ads");
      // 新規作成時はクリック数を0で初期化
      addDocumentNonBlocking(colRef, { 
        ...values, 
        clickCount: 0,
        createdAt: serverTimestamp() 
      });
      toast({ title: "追加しました", description: "新しい広告を登録しました。" });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>広告名</FormLabel>
              <FormControl>
                <Input placeholder="例：学内生協 特別キャンペーン" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>バナー画像URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/banner.jpg" {...field} />
              </FormControl>
              <FormDescription>横長（3:1程度）の画像を推奨します。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>遷移先URL</FormLabel>
              <FormControl>
                <Input placeholder="https://coop.hokkai.ac.jp/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>キャンセル</Button>
          <Button type="submit">{ad ? "保存する" : "追加する"}</Button>
        </div>
      </form>
    </Form>
  );
}
