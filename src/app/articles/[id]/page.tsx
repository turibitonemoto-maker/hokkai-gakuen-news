'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Tag, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "学内ニュース",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
};

/**
 * 記事詳細ページ
 */
export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const id = params.id as string;

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'articles', id);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(docRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article || (!article.isPublished && article.articleType !== 'Note')) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">記事が見つかりません</h2>
          <p className="text-slate-500 mb-8">お探しの記事は削除されたか、非公開に設定されています。</p>
          <Button asChild>
            <Link href="/">トップページへ戻る</Link>
          </Button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 py-12">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-8 text-slate-500 hover:text-primary gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge className="bg-primary hover:bg-primary font-bold px-4 py-1">
                {CATEGORY_LABELS[article.categoryId] || article.categoryId}
              </Badge>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                <Calendar className="h-4 w-4" />
                {article.publishDate}
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-8">
              {article.title}
            </h1>

            {article.mainImageUrl && (
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl mb-12">
                <Image
                  src={article.mainImageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </header>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map((tag: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-slate prose-lg max-w-none">
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg">
                {article.content || "記事の本文はありません。"}
              </div>
            </div>

            {article.articleType === 'Note' && (
              <div className="mt-12 p-8 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                <Share2 className="h-8 w-8 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-purple-900 mb-2">続きはnoteでチェック</h3>
                <p className="text-purple-600/70 mb-6 font-medium">外部メディア「note」にて詳細な内容を公開しています。</p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700 font-bold px-8 h-12 shadow-lg shadow-purple-200">
                  <a href={article.noteUrl} target="_blank" rel="noopener noreferrer">
                    noteで続きを読む
                  </a>
                </Button>
              </div>
            )}
          </div>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
