
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
import { Loader2, Save, ShieldAlert, AlertTriangle, Globe, Send } from "lucide-react";
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
        maintenanceMessage: config.maintenanceMessage ?? "現在メンテナンス中です。",
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
      title: "伝令を送信しました",
      description: values.isMaintenanceMode 
        ? "メンテナンスモードを【有効】にしました。公開サイトは即座に停止します。" 
        : "メンテナンスモードを【解除】しました。公開サイトが復旧します。",
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
          <h2 className="text-2xl font-bold text-slate-800">公開サイト連動設定 (伝令)</h2>
          <p className="text-sm text-slate-500">ここでの変更は Firestore を通じて、即座に表示用サイトへ反映されます。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => window.open('/site', '_blank')}
        >
          <Globe className="h-4 w-4" />
          表示サイト (/site) を確認
        </Button>
      </div>

      {isCurrentModeActive ? (
        <Alert variant="destructive" className="animate-pulse bg-destructive/10 border-destructive/20 shadow-lg">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="font-bold text-lg">メンテナンスモード実行中</AlertTitle>
          <AlertDescription className="font-medium">
            現在、公式サイトは「休止中」です。外部からの訪問者にはメンテナンス画面が表示されています。
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200 shadow-sm">
          <Globe className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 font-bold text-lg">システム正常稼働中</AlertTitle>
          <AlertDescription className="text-green-700 font-medium">
            公式サイトは一般公開されており、全コンテンツが閲覧可能です。
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            サイト停止・再開の制御
          </CardTitle>
          <CardDescription>
            スイッチを切り替えて「設定を保存」すると、伝令が送信されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-slate-100 p-6 bg-slate-50/30">
                    <div className="space-y-1">
                      <FormLabel className="text-lg font-bold flex items-center gap-2">
                        メンテナンスモードを有効にする
                        {field.value && <Badge className="bg-destructive animate-pulse ml-2">STOPPED</Badge>}
                      </FormLabel>
                      <FormDescription className="text-sm text-slate-500">
                        オンにして保存すると、公開サイトの全ページが遮断されます。
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
                    <FormLabel className="font-bold text-slate-700">訪問者向けメッセージ</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="例：2024年4月1日 10:00 〜 15:00 までメンテナンスを行います。" 
                        className="min-h-[150px] text-base leading-relaxed bg-white" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      休止画面の中央に表示されるテキストです。改行も反映されます。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-4 text-orange-900 shadow-inner">
                <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1">
                  <p className="font-bold text-sm">【重要】伝令の仕組みについて</p>
                  <p>保存ボタンを押すと、Firestore の共通設定ドキュメントが更新されます。表示用サイト（フロントエンド）はこのドキュメントをリアルタイムで監視しており、ミリ秒単位で表示が切り替わります。</p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button type="submit" className="flex items-center gap-2 px-10 h-12 text-base font-bold shadow-lg hover:translate-y-[-1px] transition-all">
                  <Save className="h-5 w-5" />
                  設定を保存して伝令を送る
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
