"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Lock, Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
    <Card className="w-full max-w-md shadow-2xl border-none bg-white/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-primary tracking-tight">
          北海学園新聞会
        </CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          コンテンツ管理システム
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pb-8">
        {serverError && (
          <Alert variant="destructive" className="mb-4 bg-destructive/5 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-bold">
              {serverError}
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-600">メールアドレス</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder=""
                        className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary transition-all duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-slate-600">パスワード</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="password"
                        placeholder=""
                        className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary transition-all duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all duration-200 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  認証中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
