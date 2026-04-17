
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { ArticleGrid } from '@/components/site/article-grid';
import { HeroSection } from '@/components/site/hero-section';
import { SidebarContent } from '@/components/site/sidebar-content';
import { Loader2 } from 'lucide-react';

/**
 * 北海学園大学新聞 公式ポータル（表示サイト）
 */
export default function RootPage() {
  const firestore = useFirestore();

  const latestArticlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'articles'),
      where('isPublished', '==', true),
      where('categoryId', '!=', 'Viewer'),
      orderBy('publishDate', 'desc'),
      limit(6)
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(latestArticlesQuery);

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <PublicHeader />
      
      <HeroSection images={[]} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <div>
              <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                Latest News <span className="h-px bg-primary/20 flex-1"></span>
              </h2>
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                </div>
              ) : (
                <ArticleGrid articles={articles || []} />
              )}
            </div>
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
