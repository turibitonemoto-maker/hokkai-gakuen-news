'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag, ChevronLeft, Share2, Printer, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const articleRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'articles', id as string);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(articleRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article || !article.isPublished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold">記事が見つかりません</h1>
        <Button onClick={() => router.push('/articles')}>記事一覧へ戻る</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-16 animate-in fade-in duration-700">
        <Link href="/articles">
          <Button variant="ghost" className="mb-8 gap-2 font-bold text-slate-500 hover:text-primary rounded-full">
            <ChevronLeft className="h-4 w-4" />
            記事一覧へ戻る
          </Button>
        </Link>

        <article className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {article.mainImageUrl && (
            <div className="relative h-[300px] md:h-[500px] w-full bg-slate-100">
              <Image 
                src={article.mainImageUrl} 
                alt={article.title} 
                fill 
                className="object-cover"
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          )}

          <div className="p-6 md:p-12">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge className="bg-primary font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px]">
                {article.categoryId}
              </Badge>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                <Calendar className="h-4 w-4" />
                {article.publishDate}
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-8 leading-tight tracking-tight">
              {article.title}
            </h1>

            <div className="flex items-center justify-between pb-8 border-b border-slate-100 mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 h-10 w-10 rounded-full flex items-center justify-center">
                  <Printer className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">提供</p>
                  <p className="text-sm font-bold text-slate-700">北海学園新聞会</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full border-slate-200">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 重要：whitespace-pre-wrap により改行と空白を維持 */}
            <div className="prose prose-slate max-w-none">
              <div className="text-lg leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                {article.content}
              </div>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 border-none px-3 py-1">
                    <Tag className="h-3 w-3 mr-1.5 opacity-50" /> {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
