
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User } from "lucide-react";
import { useEffect } from "react";

const presidentMessageSchema = z.object({
  authorName: z.string().min(1, "会長の氏名を入力してください"),
  authorImageUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  content: z.string().min(1, "挨拶の本文を入力してください"),
});

type PresidentMessageValues = z.infer<typeof presidentMessageSchema>;

export function PresidentMessageManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "settings", "president-message");
  }, [firestore]);

  const { data: messageData, isLoading } = useDoc(docRef);

  const form = useForm<PresidentMessageValues>({
    resolver: zodResolver(presidentMessageSchema),
    defaultValues: {
      authorName: "",
      authorImageUrl: "",
      content: "",
    },
  });

  // データがロードされたらフォームにセット
  useEffect(() => {
    if (messageData) {
      form.reset({
        authorName: messageData.authorName || "",
        authorImageUrl: messageData.authorImageUrl || "",
        content: messageData.content || "",
      });
    }
  }, [messageData, form]);

  function onSubmit(values: PresidentMessageValues) {
    if (!firestore || !docRef) return;

    setDocumentNonBlocking(docRef, {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "更新しました",
      description: "会長挨拶の内容を保存しました。",
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">会長挨拶管理</h2>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            メッセージの編集
          </CardTitle>
          <CardDescription>
            公式サイトの「会長挨拶」セクションに表示される内容を編集します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>会長氏名</FormLabel>
                      <FormControl>
                        <Input placeholder="例：北海 太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顔写真URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/photo.jpg" {...field} />
                      </FormControl>
                      <FormDescription>
                        会長の顔写真のURLを入力してください（正方形を推奨）。
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
                      <FormLabel>挨拶の本文</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="新入生の皆さんへ..." 
                          className="min-h-[300px] text-base leading-relaxed" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        改行は公式サイトでもそのまま反映されます。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="flex items-center gap-2 px-8">
                  <Save className="h-4 w-4" />
                  保存する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
