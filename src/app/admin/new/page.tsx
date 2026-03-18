
'use client';

import { ArticleForm } from "@/components/dashboard/article-form";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * 新規記事作成ページ（全画面没入型）
 */
export default function NewArticlePage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/admin/articles')} 
          className="rounded-full hover:bg-white shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">新規記事の編纂</h2>
          <p className="text-sm font-bold text-slate-500">新しい物語を歴史に刻みます。</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 min-h-screen p-8 md:p-16">
        <ArticleForm onSuccess={() => router.push('/admin/articles')} />
      </div>
    </div>
  );
}
