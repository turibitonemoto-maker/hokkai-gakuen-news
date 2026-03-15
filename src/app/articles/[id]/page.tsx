'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag, ChevronLeft, ImageOff, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');

  const articleRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'articles', id as string);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(articleRef);

  useEffect(() => {
    if (article?.content) {
      setSanitizedHtml(DOMPurify.sanitize(article.content));
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article || !article.isPublished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-slate-50">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">記事が見つかりません</h1>
          <p className="text-slate-500 mb-6 font-bold">削除されたか、非公開に設定されています。</p>
          <Button onClick={() => router.push('/articles')} className="font-black rounded-2xl px-8 h-12">記事一覧へ戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-20 animate-in fade-in duration-1000">
        <Link href="/articles">
          <Button variant="ghost" className="mb-10 gap-2 font-black text-slate-400 hover:text-primary rounded-full px-6 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>

        <article className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 mb-20">
          {article.mainImageUrl ? (
            <div className="relative h-[300px] md:h-[600px] w-full bg-slate-100">
              <Image 
                src={article.mainImageUrl} 
                alt={article.title} 
                fill 
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </div>
          ) : (
             <div className="relative h-[300px] md:h-[400px] w-full bg-slate-50 flex flex-col items-center justify-center text-slate-200 gap-2 border-b">
                <ImageOff className="h-20 w-20 opacity-10" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Hokkai Shinbun</span>
             </div>
          )}

          <div className="p-8 md:p-20">
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Badge className="bg-primary font-black px-5 py-2 rounded-full uppercase tracking-widest text-[10px] shadow-md border-none">
                {article.categoryId}
              </Badge>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Calendar className="h-4 w-4" />
                {article.publishDate}
              </div>
              {article.articleType === 'Note' && (
                <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 font-black rounded-full px-4">
                  <Share2 className="h-3 w-3 mr-2" /> note転載
                </Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-12 leading-[1.2] tracking-tighter">
              {article.title}
            </h1>

            <div className="flex items-center justify-between pb-12 border-b border-slate-100 mb-12">
              <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-2xl shadow-md border-2 border-slate-50 overflow-hidden">
                  <Image src="/icon.png" alt="" width={48} height={48} className="rounded-xl" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">執筆 / 提供</p>
                  <p className="text-base font-black text-slate-800">北海学園新聞会</p>
                </div>
              </div>
            </div>

            {/* 日本仕様の黄金比（leading-7, my-4）を適用 */}
            <div 
              className="prose prose-slate max-w-none 
                         text-slate-700 text-lg md:text-xl
                         prose-p:leading-7 prose-p:my-4
                         prose-headings:font-black prose-headings:tracking-tighter prose-headings:mt-8 prose-headings:mb-4
                         prose-img:rounded-3xl prose-img:shadow-2xl prose-img:my-10
                         prose-a:text-primary prose-a:font-black prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {article.tags && article.tags.length > 0 && (
              <div className="mt-20 pt-12 border-t border-slate-100 flex flex-wrap gap-3">
                {article.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 border-none px-5 py-2 rounded-2xl transition-colors">
                    <Tag className="h-3 w-3 mr-2 opacity-50" /> {tag}
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
