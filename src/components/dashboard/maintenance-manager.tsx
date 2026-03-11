
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
import { Loader2, Save, ShieldAlert, AlertTriangle, Globe } from "lucide-react";
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

    // 非同期での書き込み（伝令：Firestore経由で全サイトに通知）
    setDocumentNonBlocking(docRef, {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "システム状態を更新しました",
      description: values.isMaintenanceMode 
        ? "メンテナンスモードを有効にしました。公開サイトには休止メッセージが表示されます。" 
        : "メンテナンスモードを解除しました。公開サイトが通常通り稼働します。",
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
        <h2 className="text-2xl font-bold text-slate-800">公開サイト連動設定</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => window.open('https://hokkai-shinbun.jp', '_blank')}
        >
          <Globe className="h-4 w-4" />
          実際の表示を確認
        </Button>
      </div>

      {isCurrentModeActive ? (
        <Alert variant="destructive" className="animate-pulse bg-destructive/10">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">メンテナンスモード実行中</AlertTitle>
          <AlertDescription>
            現在、公式サイトは一時停止状態です。外部からの訪問者にはメンテナンス画面が表示されます。
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200">
          <Globe className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 font-bold">システム正常稼働中</AlertTitle>
          <AlertDescription className="text-green-700">
            公式サイトは一般公開されています。
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            サイト停止・再開の制御
          </CardTitle>
          <CardDescription>
            このスイッチを切り替えると、即座に「表示用サイト」へステータスが通知されます。
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
                        メンテナンスモードを有効にする
                        {field.value && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">実行中</span>}
                      </FormLabel>
                      <FormDescription className="text-sm">
                        オンにすると、公式サイトの全ページが遮断され、指定のメッセージのみが表示されます。
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
                    <FormLabel className="font-bold">表示用メッセージ（一般訪問者向け）</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="例：2024年4月1日 10:00 〜 15:00 までメンテナンスを行います。" 
                        className="min-h-[150px] text-base leading-relaxed" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      メンテナンスの理由、終了予定時刻、お問い合わせ先などを入力してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3 text-orange-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold mb-1">管理者へのリマインド:</p>
                  <p>この設定はFirestoreを通じて、公開中の全クライアントへ即座に同期されます。作業完了後は忘れずに解除してください。</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="flex items-center gap-2 px-8 h-11">
                  <Save className="h-4 w-4" />
                  設定を保存してサイトに反映
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
