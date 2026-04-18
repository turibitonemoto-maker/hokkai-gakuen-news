"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const maintenanceSchema = z.object({
  isMaintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1, "メッセージを入力してください"),
});

type MaintenanceValues = z.infer<typeof maintenanceSchema>;

export function MaintenanceManager() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  fireStore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => {
    if (!fireStore) return null;
    return doc(fireStore, "settings", "maintenance");
  }, [fireStore]);

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

  const handleUnlock = () => {
    const correctPassword = "zansin";
    if (password === correctPassword) {
      setIsUnlocked(true);
      toast({ title: "認証成功" });
    } else {
      toast({ variant: "destructive", title: "パスワードが正しくありません" });
    }
  };

  function onSubmit(maintenanceValues: MaintenanceValues) {
    if (!fireStore || !docRef) return;
    setDocumentNonBlocking(docRef, {
      ...maintenanceValues,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "保存しました" });
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20 font-body">
        <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-slate-50/50">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="h-10 w-10 text-primary" /></div>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">北海学園大学新聞</CardTitle>
            <p className="text-sm font-bold text-slate-500 px-6 mt-2">編集には認証が必要です。</p>
          </CardHeader>
          <CardContent className="p-10 pt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PASSCODE</label>
              <Input type="password" placeholder="パスワードを入力してください" className="text-center h-14 text-lg font-bold rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} autoFocus />
            </div>
            <Button className="w-full h-14 font-black rounded-2xl" onClick={handleUnlock}>認証する</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 font-body">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">システム設定</h2>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl bg-white">
        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <FormField
                control={form.control}
                name="isMaintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-3xl border border-slate-100 p-8 bg-slate-50/30">
                    <div className="space-y-1.5">
                      <FormLabel className="text-lg font-black text-slate-800">メンテナンスモード</FormLabel>
                      <FormDescription className="text-sm font-medium text-slate-500">
                        有効にすると一般公開が一時的に停止されます。
                      </FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125 data-[state=checked]:bg-destructive" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black text-slate-700 text-sm uppercase tracking-widest">停止中に表示するメッセージ</FormLabel>
                    <FormControl><Textarea className="min-h-[120px] rounded-2xl p-4 font-medium" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-8 border-t border-slate-100">
                <Button type="submit" className="font-black px-10 h-12 shadow-lg rounded-xl transition-transform">
                  <Save className="h-5 w-5 mr-3" /> 設定を保存する
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}