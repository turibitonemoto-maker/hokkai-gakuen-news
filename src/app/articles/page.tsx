'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { ArticleGrid } from '@/components/site/article-grid';
import { FileText, Loader2 } from 'lucide-react';

export default function ArticlesPage() {
  const firestore = useFirestore();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'articles'),
      where('isPublished', '==', true),
      orderBy('publishDate', 'desc')
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(articlesQuery);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 md:py-20 animate-in fade-in duration-1000">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter">記事一覧</h1>
          <p className="text-slate-500 font-medium text-lg">北海学園大学の「今」を、新聞会の視点からお届けします。</p>
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
