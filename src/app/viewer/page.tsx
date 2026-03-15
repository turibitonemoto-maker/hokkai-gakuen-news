'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { BookOpen, Calendar, ArrowRight, Loader2, Info, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

/**
 * 公開用：紙面ビューアー（アーカイブ一覧）
 * 北海道新聞風の「日付別グループ表示」を実現。
 */
export default function ViewerListPage() {
  const firestore = useFirestore();

  const viewerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'articles'),
      where('categoryId', '==', 'Viewer'),
      where('isPublished', '==', true),
      orderBy('publishDate', 'desc')
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(viewerQuery);

  // 日付ごとにグループ化
  const groupedArticles = useMemo(() => {
    if (!articles) return {};
    return articles.reduce((acc: any, article) => {
      const date = article.publishDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(article);
      return acc;
    }, {});
  }, [articles]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedArticles).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedArticles]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12 animate-in fade-in duration-1000">
        <div className="border-b-4 border-primary pb-6 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">紙面ビューアー</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Digital Newspaper Archives</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-none border-primary text-primary font-black hover:bg-primary hover:text-white transition-colors h-10 px-6">
              サンプルを見る
            </Button>
            <Button variant="outline" className="rounded-none border-primary text-primary font-black hover:bg-primary hover:text-white transition-colors h-10 px-6">
              使い方を見る
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : sortedDates.length > 0 ? (
          <div className="space-y-16">
            {sortedDates.map((date) => (
              <section key={date} className="animate-in slide-in-from-bottom-4 duration-700">
                <div className="bg-primary text-white px-6 py-2.5 flex items-center gap-3 mb-8 shadow-md">
                  <Calendar className="h-5 w-5 opacity-70" />
                  <h2 className="text-lg font-black tracking-widest">
                    {new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12">
                  {groupedArticles[date].map((article: any) => {
                    const transform = article.mainImageTransform || { scale: 0, x: 0, y: 0 };
                    return (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group flex flex-col">
                        <div className="relative aspect-[3/4] bg-white border border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-primary/50 transition-all duration-300 overflow-hidden mb-4">
                          {article.mainImageUrl ? (
                            <Image
                              src={article.mainImageUrl}
                              alt={article.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              style={{
                                transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                              }}
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-100 gap-2">
                              <ImageOff className="h-10 w-10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                        </div>
                        <h3 className="text-sm font-black text-slate-700 text-center leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <BookOpen className="h-16 w-16 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black italic">公開されている紙面データはありません。</p>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
