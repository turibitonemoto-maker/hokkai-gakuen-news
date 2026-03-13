
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
import { Loader2, Save, Globe, ShieldCheck, ShieldAlert, Lock, Shield } from "lucide-react";
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
  const [password, setPassword] = useState("");
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
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true);
      toast({ title: "アクセス承認", description: "システム深部へのアクセスを許可しました。" });
    } else {
      toast({ variant: "destructive", title: "パスワード不一致", description: "正しい認証情報を入力してください。" });
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
      <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in duration-500">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Shield className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">メンテナンス管理 🔒</CardTitle>
            <CardDescription className="text-sm font-bold text-slate-500 px-6 mt-2">
              伝統を保護するためのアクセス承認が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">承認パスワード</label>
              <Input 
                type="password" 
                placeholder="Password" 
                className="text-center h-14 text-lg font-bold rounded-2xl border-slate-200 focus:border-primary focus:ring-primary transition-all shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
            </div>
            <Button className="w-full h-14 font-black text-md rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95" onClick={handleUnlock}>
              アクセスを承認する
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">メンテナンス管理 🔒</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">サイトの稼働状況をコントロールします。</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 font-black rounded-xl h-10 border-slate-200 px-5"
          onClick={() => window.open(PUBLIC_SITE_URL, '_blank')}
        >
          <Globe className="h-4 w-4" />
          表示サイトを確認
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-black flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              稼働ステータス
            </CardTitle>
            {config?.isMaintenanceMode ? (
              <Badge variant="destructive" className="h-10 px-6 font-black text-sm animate-pulse rounded-full shadow-md">
                <ShieldAlert className="h-5 w-5 mr-2" /> メンテナンス中
              </Badge>
            ) : (
              <Badge variant="default" className="h-10 px-6 font-black text-sm bg-green-500 hover:bg-green-600 rounded-full shadow-md">
                <ShieldCheck className="h-5 w-5 mr-2" /> 正常稼働中
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-3xl border border-slate-100 p-10 bg-slate-50/30">
                    <div className="space-y-1.5">
                      <FormLabel className="text-xl font-black text-slate-800">メンテナンスモード 🔒</FormLabel>
                      <FormDescription className="text-sm font-medium text-slate-500 max-w-md">
                        有効にすると全ページがメンテナンス画面に切り替わります。
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="scale-150 data-[state=checked]:bg-destructive"
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
                    <FormLabel className="font-black text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
                      停止中に表示するメッセージ
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="理由を入力してください" className="min-h-[140px] bg-white border-slate-200 rounded-2xl p-6 text-lg font-medium shadow-inner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-8 border-t border-slate-100">
                <Button type="submit" className="font-black px-12 h-14 shadow-xl shadow-primary/20 rounded-2xl text-lg hover:scale-105 transition-transform">
                  <Save className="h-5 w-5 mr-3" />
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
