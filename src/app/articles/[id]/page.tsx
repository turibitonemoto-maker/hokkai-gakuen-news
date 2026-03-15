
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag, ChevronLeft, ImageOff, Share2, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';

// Googleドライブのリンクをプレビュー用に変換するヘルパー
function getDriveEmbedUrl(url: string) {
  if (!url) return null;
  if (!url.includes('drive.google.com')) return url;
  
  // /file/d/FILE_ID/view?usp=sharing 形式を /file/d/FILE_ID/preview へ変換
  return url.replace(/\/view(\?.*)?$/, '/preview');
}

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
          <Button onClick={() => router.push('/articles')} className="font-black rounded-2xl mt-4">一覧へ戻る</Button>
        </div>
      </div>
    );
  }

  const embedPdfUrl = getDriveEmbedUrl(article.pdfUrl || "");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body">
      <PublicHeader />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-20 animate-in fade-in duration-1000">
        <Link href="/articles">
          <Button variant="ghost" className="mb-10 gap-2 font-black text-slate-400 hover:text-primary rounded-full px-6">
            <ChevronLeft className="h-4 w-4" /> 一覧に戻る
          </Button>
        </Link>

        <article className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 mb-12">
          {article.mainImageUrl ? (
            <div className="relative h-[300px] md:h-[500px] w-full bg-slate-100">
              <Image 
                src={article.mainImageUrl} 
                alt={article.title} 
                fill 
                className="object-cover"
                priority
                unoptimized={article.mainImageUrl.startsWith('data:')}
                sizes="100vw"
              />
            </div>
          ) : (
             <div className="relative h-[200px] w-full bg-slate-50 flex flex-col items-center justify-center text-slate-200 gap-2 border-b">
                <ImageOff className="h-12 w-12 opacity-10" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-20">No Eyecatch</span>
             </div>
          )}

          <div className="p-8 md:p-16">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <Badge className="bg-primary font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest">
                {article.categoryId}
              </Badge>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                <Calendar className="h-4 w-4" /> {article.publishDate}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-10 leading-tight tracking-tighter">
              {article.title}
            </h1>

            {/* 本文エリア（日本仕様の黄金比適用） */}
            <div 
              className="prose prose-slate max-w-none 
                         text-slate-700 text-lg
                         prose-p:leading-7 prose-p:my-4
                         prose-headings:font-black prose-headings:tracking-tighter
                         prose-img:rounded-2xl prose-img:shadow-xl prose-img:my-8
                         prose-a:text-primary prose-a:font-black"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {/* 新聞紙面PDFビューアー（道新スタイル） */}
            {embedPdfUrl && (
              <div className="mt-16 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="bg-red-50 p-2 rounded-lg text-red-600">
                    <FileType className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">新聞紙面を閲覧</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Paper Viewer</p>
                  </div>
                </div>
                <div className="aspect-[3/4] md:aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-50 bg-slate-200">
                  <iframe 
                    src={embedPdfUrl} 
                    className="w-full h-full border-none" 
                    allow="autoplay"
                    title="Newspaper View"
                  ></iframe>
                </div>
                <div className="text-center">
                  <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="rounded-full px-8 gap-2 font-bold text-slate-500 hover:text-primary">
                      別タブで全画面表示
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-50 text-slate-400 font-bold px-4 py-1.5 rounded-xl border-none">
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
