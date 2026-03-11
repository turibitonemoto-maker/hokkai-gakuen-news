
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldAlert, AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const maintenanceSchema = z.object({
  isMaintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1, "メッセージを入力してください"),
});

type MaintenanceValues = z.infer<typeof maintenanceSchema>;

export function MaintenanceManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "settings", "maintenance");
  }, [firestore]);

  const { data: config, isLoading } = useDoc(docRef);

  const form = useForm<MaintenanceValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      isMaintenanceMode: false,
      maintenanceMessage: "現在、システムメンテナンスのためサイトを一時停止しております。ご不便をおかけしますが、再開まで今しばらくお待ちください。",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        isMaintenanceMode: config.isMaintenanceMode || false,
        maintenanceMessage: config.maintenanceMessage || "",
      });
    }
  }, [config, form]);

  function onSubmit(values: MaintenanceValues) {
    if (!firestore || !docRef) return;

    setDocumentNonBlocking(docRef, {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "設定を更新しました",
      description: values.isMaintenanceMode 
        ? "メンテナンスモードを有効にしました。表示用サイトは停止されます。" 
        : "メンテナンスモードを解除しました。サイトを再開します。",
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCurrentModeActive = form.watch("isMaintenanceMode");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">システムメンテナンス設定</h2>
      </div>

      {isCurrentModeActive && (
        <Alert variant="destructive" className="animate-pulse">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>メンテナンスモード有効中</AlertTitle>
          <AlertDescription>
            現在、公式サイトは一時停止状態です。一般の訪問者はアクセスできません。
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            サイト停止・再開の管理
          </CardTitle>
          <CardDescription>
            表示用サーバーの更新作業や、緊急の不具合対応時にサイトを一時的に停止できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-slate-100 p-6 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-lg font-bold flex items-center gap-2">
                        メンテナンスモード
                        {field.value && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">実行中</span>}
                      </FormLabel>
                      <FormDescription className="text-sm">
                        オンにすると、公式サイトにメンテナンス画面が表示され、通常のコンテンツが非表示になります。
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="scale-125 data-[state=checked]:bg-destructive"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">メンテナンス中に表示するメッセージ</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="例：2024年4月1日 10:00 〜 15:00 までメンテナンスを行います。" 
                        className="min-h-[150px] text-base leading-relaxed" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      サイト停止理由や再開予定時刻などを記載してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3 text-orange-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  <strong>注意:</strong> この設定は「表示用サイト」に即座に反映されます。管理パネル自体は引き続き利用可能ですが、作業が完了したら必ず「オフ」にしてサイトを再開してください。
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="flex items-center gap-2 px-8 h-11">
                  <Save className="h-4 w-4" />
                  設定を保存して適用
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
