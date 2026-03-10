
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Lock, Mail, ShieldCheck, Loader2 } from "lucide-react";
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
import { useAuth, initiateEmailSignIn, errorEmitter } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { AUTHORIZED_EMAILS } from "@/lib/auth-constants";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
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
      // Firebaseの最新仕様では auth/invalid-credential に集約されることが多いですが、
      // 互換性のために複数のコードをチェックします
      if (
        error.message.includes("auth/invalid-credential") || 
        error.message.includes("auth/user-not-found") || 
        error.message.includes("auth/wrong-password") ||
        error.message.includes("auth/invalid-email")
      ) {
        errorMessage = "メールアドレスまたはパスワードが正しくありません。";
      }

      toast({
        variant: "destructive",
        title: "認証エラー",
        description: errorMessage,
      });
    };

    errorEmitter.on('auth-error', handleAuthError);
    return () => errorEmitter.off('auth-error', handleAuthError);
  }, [toast]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);

    // 許可されたメールアドレスリストを事前にチェック
    if (!AUTHORIZED_EMAILS.includes(values.email)) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "アクセス権限がありません",
        description: "入力されたメールアドレスは管理者として登録されていません。",
      });
      return;
    }

    initiateEmailSignIn(auth, values.email, values.password);
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl font-headline font-bold text-primary tracking-tight">
          北海学園一部新聞会
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          CMS 管理パネルへログイン
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">メールアドレス</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="name@hokkai-shinbun.jp"
                        className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary transition-all duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700">パスワード</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary transition-all duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md transition-all duration-200 active:scale-[0.98]"
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
      <CardFooter className="flex flex-col gap-4 text-center pb-8">
        <div className="text-xs text-muted-foreground">
          アクセスにお困りですか？ 管理者へお問い合わせください。
        </div>
      </CardFooter>
    </Card>
  );
}
