"use client";

import * as React from "react";
import { useState } from "react";
import { Lock, Mail, User, ShieldCheck, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AUTHORIZED_EMAILS } from "@/lib/auth-constants";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
});

interface LoginFormProps {
  onSuccess: (email: string) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setAuthError(null);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (AUTHORIZED_EMAILS.includes(values.email)) {
      if (values.password === "password123") {
        onSuccess(values.email);
      } else {
        setAuthError("パスワードが正しくありません。");
      }
    } else {
      setAuthError("このメールアドレスは許可されていません。");
    }
    setIsLoading(false);
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
          SecureEntry
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          許可されたメールアドレスでログインしてください
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
                        placeholder="name@example.com"
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

            {authError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <span>{authError}</span>
              </div>
            )}

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