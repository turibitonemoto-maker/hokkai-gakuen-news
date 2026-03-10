
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Lock, Mail, ShieldCheck, Loader2, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth, initiateEmailSignIn, errorEmitter } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { AUTHORIZED_EMAILS } from "@/lib/auth-constants";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上である必要があります。" }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const handleAuthError = (error: Error) => {
      setIsLoading(false);
      
      let errorMessage = "ログインに失敗しました。";
      
      if (error.message.includes("auth/invalid-credential")) {
        errorMessage = "認証に失敗しました。以下の2点を確認してください：\n1. パスワードが正しいか\n2. Firebaseコンソールの「Users」にこのメールアドレスを登録済みか";
      } else if (error.message.includes("auth/user-not-found")) {
        errorMessage = "ユーザーが見つかりません。Firebaseコンソールでユーザーを作成してください。";
      } else if (error.message.includes("auth/wrong-password")) {
        errorMessage = "パスワードが間違っています。";
      } else {
        errorMessage = `エラー: ${error.message}`;
      }

      setServerError(errorMessage);
    };

    errorEmitter.on('auth-error', handleAuthError);
    return () => errorEmitter.off('auth-error', handleAuthError);
  }, []);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setServerError(null);

    const inputEmail = values.email.toLowerCase();
    const isAuthorized = AUTHORIZED_EMAILS.some(email => email.toLowerCase() === inputEmail);

    if (!isAuthorized) {
      setIsLoading(false);
      setServerError("このメールアドレスは管理システムへのアクセスが許可されていません。lib/auth-constants.ts を確認してください。");
      return;
    }

    initiateEmailSignIn(auth, values.email, values.password);
    
    // タイムアウトによるisLoading解除（万が一Firebaseから応答がない場合のため）
    setTimeout(() => setIsLoading(false), 10000);
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-none bg-white/90 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-primary tracking-tight">
          Hokkai Gakuen News 1
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          コンテンツ管理システム
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {serverError && (
          <Alert variant="destructive" className="mb-4 bg-destructive/5 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">ログインできません</AlertTitle>
            <AlertDescription className="text-[11px] whitespace-pre-wrap leading-relaxed">
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
                        placeholder="admin@hokkai-shinbun.jp"
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
                        placeholder="6文字以上のパスワード"
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
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  認証処理中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center pb-8 px-6">
        <div className="text-[11px] text-muted-foreground bg-slate-50 p-4 rounded-xl border border-slate-100 text-left w-full space-y-3">
          <p className="font-bold flex items-center gap-1 text-slate-700">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> ログインできない場合：
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-500 pl-1">
            <li>Firebaseコンソールで<strong>メール/パスワード認証</strong>を有効にしましたか？</li>
            <li><strong>Authentication &gt; Users</strong>タブで、このメールアドレスのユーザーを登録しましたか？</li>
            <li>パスワードは<strong>6文字以上</strong>入力していますか？</li>
          </ol>
          <div className="pt-2 border-t border-slate-200">
            <p className="font-bold text-slate-700 mb-1">許可リストに含まれるアドレス:</p>
            <p className="font-mono text-[9px] break-all leading-tight opacity-70">
              {AUTHORIZED_EMAILS.slice(0, 3).join(", ")} ...他
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
