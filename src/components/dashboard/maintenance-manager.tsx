
'use client';

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
import { Loader2, Save, Globe, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const PUBLIC_SITE_URL = "https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/";

const maintenanceSchema = z.object({
  isMaintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1, "メッセージを入力してください"),
});

type MaintenanceValues = z.infer<typeof maintenanceSchema>;

export function MaintenanceManager() {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
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
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        isMaintenanceMode: config.isMaintenanceMode ?? false,
        maintenanceMessage: config.maintenanceMessage ?? "現在、メンテナンスのため一時停止しております。",
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

  const handleUnlock = () => {
    if (pin === "1950") {
      setIsUnlocked(true);
    } else {
      toast({ variant: "destructive", title: "PINコードが違います" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <Card className="max-w-md mx-auto mt-20 shadow-xl">
        <CardHeader className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>システム保護</CardTitle>
          <CardDescription>設定を変更するには4桁の認証コードが必要です</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            type="password" 
            placeholder="****" 
            className="text-center text-2xl tracking-[1em]"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <Button className="w-full h-12 font-bold" onClick={handleUnlock}>認証</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">表示サイト制御設定</h2>
          <p className="text-sm text-slate-500">サイトの稼働・停止を切り替えます。</p>
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
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              現在のステータス
            </CardTitle>
            {config?.isMaintenanceMode ? (
              <Badge variant="destructive" className="h-8 px-4 font-bold text-sm animate-pulse">
                <ShieldAlert className="h-4 w-4 mr-2" /> 停止中
              </Badge>
            ) : (
              <Badge variant="default" className="h-8 px-4 font-bold text-sm bg-green-500 hover:bg-green-600">
                <ShieldCheck className="h-4 w-4 mr-2" /> 稼働中
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 p-8 bg-slate-50/50">
                    <div className="space-y-1">
                      <FormLabel className="text-lg font-bold">メンテナンスモード</FormLabel>
                      <FormDescription className="text-sm">
                        有効にすると全ページがメンテナンス画面に切り替わります。
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="scale-125"
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
                    <FormLabel className="font-bold text-slate-700">停止中に表示するメッセージ</FormLabel>
                    <FormControl>
                      <Textarea placeholder="理由を入力してください" className="min-h-[120px] bg-white border-slate-200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
