
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { HeroSection } from '@/components/site/hero-section';
import { ArticleGrid } from '@/components/site/article-grid';
import { SidebarContent } from '@/components/site/sidebar-content';
import { PublicFooter } from '@/components/site/public-footer';
import { MaintenanceGuard } from '@/components/site/maintenance-guard';
import { Loader2 } from 'lucide-react';

/**
 * 公開用ウェブサイトのメインページ
 * 管理画面で設定したコンテンツを動的に表示します。
 */
export default function HomePage() {
  const firestore = useFirestore();

  // メンテナンス設定の取得
  const maintenanceRef = useMemoFirebase(() => doc(firestore, 'settings', 'maintenance'), [firestore]);
  const { data: maintenanceConfig, isLoading: isMaintenanceLoading } = useDoc(maintenanceRef);

  // 公開済み記事の取得
  const articlesQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'articles'),
      where('isPublished', '==', true),
      orderBy('publishDate', 'desc'),
      limit(20)
    );
  }, [firestore]);
  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);

  // ヒーロー画像の取得
  const heroQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'hero-images'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: heroImages } = useCollection(heroQuery);

  // 広告の取得
  const adsQuery = useMemoFirebase(() => collection(firestore, 'ads'), [firestore]);
  const { data: ads } = useCollection(adsQuery);

  if (isMaintenanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // メンテナンスモードのチェック
  if (maintenanceConfig?.isMaintenanceMode) {
    return <MaintenanceGuard message={maintenanceConfig.maintenanceMessage} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1">
        <HeroSection images={heroImages || []} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* メインコンテンツ：記事一覧 */}
            <div className="lg:col-span-8">
              <section>
                <div className="flex items-center justify-between mb-8 border-b-2 border-primary/20 pb-2">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                    最新のニュース
                  </h2>
                </div>
                {isArticlesLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
                  </div>
                ) : (
                  <ArticleGrid articles={articles || []} />
                )}
              </section>
            </div>

            {/* サイドバー：会長挨拶、広告など */}
            <aside className="lg:col-span-4 space-y-10">
              <SidebarContent ads={ads || []} />
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
