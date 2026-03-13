
'use client';

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Settings, Send, Radio } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const PUBLIC_SITE_URL = "https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/";

const maintenanceSchema = z.object({
  isMaintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1, "メッセージを入力してください"),
  systemStatusMessage: z.string().optional(),
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
      maintenanceMessage: "現在、メンテナンスのため一時停止しております。",
      systemStatusMessage: "正常稼働中",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        isMaintenanceMode: config.isMaintenanceMode ?? false,
        maintenanceMessage: config.maintenanceMessage ?? "現在、メンテナンスのため一時停止しております。",
        systemStatusMessage: config.systemStatusMessage ?? "正常稼働中",
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
      title: "保存しました",
      description: "表示サイトの制御設定を更新しました。",
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
          <h2 className="text-2xl font-bold text-slate-800">表示サイト制御設定</h2>
          <p className="text-sm text-slate-500">緊急時のメンテナンス画面やステータスを制御します。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 font-bold"
          onClick={() => window.open(PUBLIC_SITE_URL, '_blank')}
        >
          <Globe className="h-4 w-4" />
          表示サイトを確認
        </Button>
      </div>

      <Card className="shadow-md border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Radio className="h-5 w-5" />
            表示サイトへの状況伝令
          </CardTitle>
          <CardDescription>
            表示サイトに現在の作業状況を知らせます。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="systemStatusMessage"
                render={({ field }) => (
                  <FormItem className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <FormLabel className="text-blue-700 font-bold flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4" /> ステータスメッセージ
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例：インデックス作成中につき待機せよ" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isMaintenanceMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 p-6">
                      <div className="space-y-1">
                        <FormLabel className="text-base font-bold flex items-center gap-2">
                          メンテナンスモード
                          {field.value && <Badge variant="destructive" className="ml-2">稼働停止</Badge>}
                        </FormLabel>
                        <FormDescription>
                          有効にすると表示サイト全体がメンテナンス画面になります。
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maintenanceMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 text-sm">メンテナンス中の表示メッセージ</FormLabel>
                      <FormControl>
                        <Textarea placeholder="理由を入力してください" className="min-h-[100px] bg-slate-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" className="font-bold px-10 h-11 shadow-lg">
                  <Save className="h-5 w-5 mr-2" />
                  設定を保存
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
