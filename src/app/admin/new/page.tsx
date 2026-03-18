
'use client';

import { ArticleForm } from "@/components/dashboard/article-form";
import { useRouter } from "next/navigation";

/**
 * 新規記事作成ページ（完全没入型フルスクリーン）
 */
export default function NewArticlePage() {
  const router = useRouter();

  return (
    <ArticleForm onSuccess={() => router.push('/admin/articles')} />
  );
}
