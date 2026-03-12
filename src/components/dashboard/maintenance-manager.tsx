"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Settings } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

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
      maintenanceMessage: "現在、システムメンテナンスのためサイトを一時停止しております。ご不便をおかけしますが、完了までお待ちください。",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        isMaintenanceMode: config.isMaintenanceMode ?? false,
        maintenanceMessage: config.maintenanceMessage ?? "現在、システムメンテナンスのためサイトを一時停止しております。",
      });
    }
  }, [config, form]);

  function onSubmit(maintenanceValues: MaintenanceValues) {
    if (!firestore || !docRef) return;

    setDocumentNonBlocking(docRef, {
      ...maintenanceValues,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "設定を保存しました",
      description: maintenanceValues.isMaintenanceMode 
        ? "メンテナンスモードを有効にしました。" 
        : "メンテナンスモードを解除しました。",
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">公開サイト制御設定</h2>
          <p className="text-sm text-slate-500">緊急時のメンテナンス画面切り替えを制御します。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 font-bold"
          onClick={() => window.open('/', '_blank')}
        >
          <Globe className="h-4 w-4" />
          現在の表示を確認
        </Button>
      </div>

      <Card className="shadow-md border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            サイト公開設定
          </CardTitle>
          <CardDescription>
            サイト全体の公開・休止をリアルタイムで制御します。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 p-6 bg-slate-50/30">
                    <div className="space-y-1">
                      <FormLabel className="text-base font-bold flex items-center gap-2">
                        メンテナンスモードを有効にする
                        {field.value && <Badge variant="destructive" className="ml-2 animate-pulse">停止中</Badge>}
                      </FormLabel>
                      <FormDescription>
                        有効にすると、全ユーザーに対してメンテナンス画面が強制的に表示されます。
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

              <FormField
                control={form.control}
                name="maintenanceMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">訪問者に表示するメッセージ</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="メンテナンス理由や再開予定などを入力してください。" 
                        className="min-h-[150px] bg-slate-50" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" className="flex items-center gap-2 font-bold px-10 h-11 shadow-lg">
                  <Save className="h-5 w-5" />
                  設定を保存する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}