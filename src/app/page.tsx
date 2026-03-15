
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { ArticleGrid } from '@/components/site/article-grid';
import { Loader2 } from 'lucide-react';

/**
 * 表示用サイトのトップページ。
 * 最新の公開記事を抽出し、新聞会の視点を読者へ届けます。
 */
export default function RootPage() {
  const firestore = useFirestore();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'articles'),
      where('isPublished', '==', true),
      orderBy('publishDate', 'desc'),
      limit(12)
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(articlesQuery);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 md:py-20 animate-in fade-in duration-1000">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
               <div className="h-1 w-8 bg-primary rounded-full" />
               Latest News
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter leading-none">
              学園の「今」を、<br />
              新聞会の視点で。
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-lg max-w-md border-l-4 border-slate-200 pl-6 py-2">
            北海学園大学一部新聞会がお届けする、学内ニュース・イベント・コラムの集積地。
            真実を伝え、未来を創る報道をここから。
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <ArticleGrid articles={articles || []} />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
