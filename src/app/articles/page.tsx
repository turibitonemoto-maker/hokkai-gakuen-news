
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { ArticleGrid } from '@/components/site/article-grid';
import { PublicFooter } from '@/components/site/public-footer';
import { Loader2, Newspaper } from 'lucide-react';

/**
 * 記事一覧ページ
 */
export default function ArticlesListPage() {
  const firestore = useFirestore();

  const articlesQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'articles'), orderBy('publishDate', 'desc'));
  }, [firestore]);

  const { data: allArticles, isLoading } = useCollection(articlesQuery);

  const publishedArticles = useMemo(() => {
    if (!allArticles) return [];
    return allArticles.filter(a => a.isPublished === true);
  }, [allArticles]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-primary p-3 rounded-2xl text-white">
              <Newspaper className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">記事一覧</h1>
              <p className="text-slate-500 font-medium">北海学園大学一部新聞会が届ける全ニュース</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
            </div>
          ) : (
            <ArticleGrid articles={publishedArticles} />
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
