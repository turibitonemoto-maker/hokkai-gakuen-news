
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, initiateEmailSignIn, errorEmitter } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(1, { message: "パスワードを入力してください。" }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const auth = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const handleAuthError = (error: any) => {
      setIsLoading(false);
      let errorMessage = "ログインに失敗しました。";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "メールアドレスまたはパスワードが正しくありません。";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "何度も失敗したため、一時的にロックされています。少し時間を置いてからお試しください。";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "ネットワークエラーが発生しました。インターネット接続を確認してください。";
      } else {
        errorMessage = `エラーが発生しました (${error.code || error.message})`;
      }
      
      setServerError(errorMessage);
    };

    errorEmitter.on('auth-error', handleAuthError);
    return () => errorEmitter.off('auth-error', handleAuthError);
  }, []);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setServerError(null);
    initiateEmailSignIn(auth, values.email, values.password);
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300 rounded-[3rem] overflow-hidden">
      <CardHeader className="space-y-1 pb-6 text-center pt-12">
        <div className="flex justify-center mb-8">
          <div className="bg-white p-2 rounded-[2rem] shadow-2xl border-4 border-slate-50 overflow-hidden transform hover:scale-110 transition-transform">
            <Image 
              src="/icon.png" 
              alt="北海学園新聞会" 
              width={100} 
              height={100} 
              className="rounded-2xl"
              priority
            />
          </div>
        </div>
        <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">
          北海学園新聞会
        </CardTitle>
        <CardDescription className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] pt-2">
          CONTENTS CONTROL SYSTEM
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-10 pb-16">
        {serverError && (
          <Alert variant="destructive" className="mb-4 bg-destructive/5 border-destructive/20 text-destructive rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-bold">
              {serverError}
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メールアドレス</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder=""
                        className="pl-14 h-16 rounded-[1.5rem] border-slate-100 bg-slate-50/50 focus:border-primary focus:ring-primary transition-all duration-300 font-bold text-lg"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="password"
                        placeholder=""
                        className="pl-14 h-16 rounded-[1.5rem] border-slate-100 bg-slate-50/50 focus:border-primary focus:ring-primary transition-all duration-300 font-bold text-lg"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black text-xl rounded-[1.5rem] shadow-2xl shadow-primary/20 transition-all duration-300 mt-6 active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  認証中
                </>
              ) : (
                "管制塔へ入る"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
