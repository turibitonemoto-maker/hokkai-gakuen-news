
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Lock, Mail, ShieldCheck, Loader2, AlertCircle, Info } from "lucide-react";
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
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
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
      console.error("Login component caught error:", error);
      
      let errorMessage = "ログインに失敗しました。";
      
      // Firebaseの具体的なエラーコードに基づいたメッセージ
      if (error.message.includes("auth/invalid-credential") || error.message.includes("auth/user-not-found") || error.message.includes("auth/wrong-password")) {
        errorMessage = "メールアドレスまたはパスワードが正しくありません。Firebaseコンソールの 'Users' タブで、このメールアドレスが登録されているか、パスワードが正しいか確認してください。";
      } else if (error.message.includes("auth/operation-not-allowed")) {
        errorMessage = "Firebaseコンソールで「メール/パスワード」ログイン方法が有効になっていません。";
      } else if (error.message.includes("auth/network-request-failed")) {
        errorMessage = "ネットワーク接続に失敗しました。";
      } else if (error.message.includes("auth/too-many-requests")) {
        errorMessage = "短時間に何度も失敗したため、一時的にロックされています。少し時間を置いてから再試行してください。";
      } else {
        errorMessage = `エラー: ${error.message}`;
      }

      setServerError(errorMessage);
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
    setServerError(null);

    // 大文字小文字を区別せずにチェック
    const inputEmail = values.email.toLowerCase();
    const isAuthorized = AUTHORIZED_EMAILS.some(email => email.toLowerCase() === inputEmail);

    // 1. コード内の許可リスト（Whitelist）チェック
    if (!isAuthorized) {
      setIsLoading(false);
      const msg = `アクセス権限がありません。以下のリストに登録されているメールアドレスを使用してください。`;
      setServerError(msg);
      toast({
        variant: "destructive",
        title: "アクセス制限",
        description: "入力されたメールアドレスは管理者リストに含まれていません。",
      });
      return;
    }

    // 2. Firebase Authでの認証試行
    initiateEmailSignIn(auth, values.email, values.password);
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-none bg-white/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-primary tracking-tight">
          北海学園一部新聞会
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          CMS 管理パネル
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {serverError && (
          <Alert variant="destructive" className="mb-4 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>認証に失敗しました</AlertTitle>
            <AlertDescription className="text-xs">
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
                  <FormLabel className="text-sm font-semibold text-slate-700">メールアドレス</FormLabel>
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
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md transition-all duration-200"
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
        <div className="text-xs text-muted-foreground bg-slate-50 p-4 rounded-lg border border-slate-100 text-left w-full space-y-2">
          <p className="font-bold flex items-center gap-1 text-slate-800">
            <Info className="h-3 w-3" /> 確認項目:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>以下のメールアドレスが <strong>Firebase Authentication (Users)</strong> に登録されていますか？</li>
            <li>Firebase側で <strong>Email/Password 認証</strong> が有効になっていますか？</li>
            <li>パスワードは大文字・小文字・記号を含め正確ですか？</li>
          </ul>
          <div className="mt-2 p-2 bg-slate-200 rounded text-[10px] font-mono break-all">
            <strong>許可リスト:</strong><br />
            {AUTHORIZED_EMAILS.join(", ")}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
