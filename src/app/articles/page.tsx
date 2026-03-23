
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { ArticleGrid } from '@/components/site/article-grid';
import { SidebarContent } from '@/components/site/sidebar-content';
import { Loader2, FileText } from 'lucide-react';

export default function ArticlesPage() {
  const firestore = useFirestore();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'articles'),
      where('isPublished', '==', true),
      where('categoryId', '!=', 'Viewer'),
      orderBy('categoryId'),
      orderBy('publishDate', 'desc')
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(articlesQuery);

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <div className="bg-primary/10 p-4 rounded-[2rem] text-primary">
            <FileText className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase">Articles</h1>
          <p className="text-slate-500 font-bold max-w-xl">
            北海学園大学新聞が届ける、キャンパスの「今」を記録した記事アーカイブ。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              </div>
            ) : (
              <ArticleGrid articles={articles || []} />
            )}
          </div>

          <aside className="lg:col-span-4">
            <SidebarContent ads={[]} />
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
