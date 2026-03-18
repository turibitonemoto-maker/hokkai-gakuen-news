
'use client';

import { useParams, useRouter } from "next/navigation";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { ArticleForm } from "@/components/dashboard/article-form";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 記事編集ページ（完全没入型フルスクリーン）
 */
export default function EditArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "articles", id as string);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(docRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black text-slate-400 uppercase tracking-widest">記事データを復元中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
        <div className="bg-red-50 p-6 rounded-full text-red-500">
          <AlertCircle className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-slate-800">記事が見つかりません</h3>
          <p className="text-sm text-slate-500 mt-2">指定されたIDの聖典は存在しないか、抹消されています。</p>
        </div>
        <Button onClick={() => router.push('/admin/articles')} variant="outline" className="rounded-xl font-bold">
          記事一覧へ戻る
        </Button>
      </div>
    );
  }

  return (
    <ArticleForm article={article} onSuccess={() => router.push('/admin/articles')} />
  );
}
