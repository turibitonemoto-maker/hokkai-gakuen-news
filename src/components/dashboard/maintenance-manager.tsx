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
import { Loader2, Save, ShieldAlert, Globe, Settings } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      maintenanceMessage: "現在、システムメンテナンスのためサイトを一時停止しております。ご不便をおかけしますが、再開まで今しばらくお待ちください。",
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

  function onSubmit(values: MaintenanceValues) {
    if (!firestore || !docRef) return;

    setDocumentNonBlocking(docRef, {
      ...values,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "設定を保存しました",
      description: values.isMaintenanceMode 
        ? "メンテナンスモードを有効にしました。公開サイトが停止します。" 
        : "メンテナンスモードを解除しました。公開サイトが復旧します。",
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">公開サイト制御設定</h2>
          <p className="text-sm text-slate-500">ここでの設定変更は、Firestoreを通じて即座に表示サイトへ反映されます。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => window.open('/site', '_blank')}
        >
          <Globe className="h-4 w-4" />
          表示サイトを確認
        </Button>
      </div>

      {isCurrentModeActive ? (
        <Alert variant="destructive" className="animate-pulse bg-destructive/5 border-destructive/20 shadow-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="font-bold">メンテナンスモード実行中</AlertTitle>
          <AlertDescription className="text-sm">
            現在、公式サイトはメンテナンス画面になっています。一般公開は停止されています。
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200 shadow-sm">
          <Globe className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 font-bold">システム正常稼働中</AlertTitle>
          <AlertDescription className="text-green-700 text-sm">
            公式サイトは正常に公開されています。
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            サイト公開設定
          </CardTitle>
          <CardDescription>
            メンテナンス中の表示メッセージや、サイト全体の公開・休止を制御します。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-100 p-6 bg-slate-50/30">
                    <div className="space-y-1">
                      <FormLabel className="text-base font-bold flex items-center gap-2">
                        メンテナンスモードを有効にする
                        {field.value && <Badge variant="destructive" className="animate-pulse ml-2">停止中</Badge>}
                      </FormLabel>
                      <FormDescription className="text-sm text-slate-500">
                        オンにして保存すると、公開サイトの全ページがメンテナンス画面に切り替わります。
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-destructive"
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
                    <FormLabel className="font-bold text-slate-700">訪問者向けメッセージ</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="メンテナンス理由や終了予定を入力してください。" 
                        className="min-h-[150px] text-base leading-relaxed" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      サイト休止画面の中央に表示されるテキストです。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" className="flex items-center gap-2 px-8 h-12 text-base font-bold shadow-md">
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
