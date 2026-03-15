
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag, ChevronLeft, ImageOff, FileType, Shield, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "キャンパス",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
  Viewer: "紙面ビューアー",
};

// Googleドライブのリンクをプレビュー用に変換し、UIを最小化する
function getDriveEmbedUrl(url: string) {
  if (!url) return null;
  if (!url.includes('drive.google.com')) return url;
  
  // ファイルIDの抽出
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!fileIdMatch) return url;
  
  // /preview 形式へ強制変換
  return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
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
      
      // 閲覧数のカウントアップ（非同期）
      if (articleRef) {
        updateDoc(articleRef, { viewCount: increment(1) }).catch(() => {});
      }
    }
  }, [article, articleRef]);

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
            <div className="w-full">
              <div className="relative aspect-video w-full bg-slate-100">
                <Image 
                  src={article.mainImageUrl} 
                  alt={article.title} 
                  fill 
                  className="object-cover"
                  priority
                  unoptimized
                  sizes="100vw"
                />
              </div>
              {article.imageCaption && (
                <div className="px-8 md:px-16 py-4 bg-slate-50 border-b flex items-start gap-3">
                  <MessageSquareText className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                  <p className="text-xs md:text-sm text-slate-500 italic font-medium leading-relaxed">
                    {article.imageCaption}
                  </p>
                </div>
              )}
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
                {CATEGORY_LABELS[article.categoryId] || article.categoryId}
              </Badge>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                <Calendar className="h-4 w-4" /> {article.publishDate}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-10 leading-tight tracking-tighter">
              {article.title}
            </h1>

            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {/* ステルス・デジタル紙面ビューアー */}
            {embedPdfUrl && (
              <div className="mt-16 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-2 rounded-lg text-red-600">
                      <FileType className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">新聞紙面（電子版）</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Edition Viewer</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="hidden sm:flex items-center gap-2 border-slate-200 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full">
                    <Shield className="h-3 w-3" /> 複製禁止・閲覧専用
                  </Badge>
                </div>
                
                <div className="relative group">
                  <div className="aspect-[3/4] md:aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-100 bg-slate-50">
                    <iframe 
                      src={embedPdfUrl} 
                      className="w-full h-full border-none pointer-events-auto" 
                      allow="autoplay"
                      title="Newspaper View"
                    ></iframe>
                  </div>
                  <div className="absolute inset-x-0 top-0 h-12 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                    <span className="text-[8px] font-black text-slate-400 bg-white/80 px-4 py-1 rounded-full shadow-sm">
                      北海学園大学一部新聞会 著作権保護コンテンツ
                    </span>
                  </div>
                </div>
                
                <div className="text-center pt-4">
                  <p className="text-[10px] text-slate-400 font-medium mb-4">
                    ※紙面のダウンロードは禁止されています。閲覧環境により表示が遅れる場合があります。
                  </p>
                  <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="rounded-full px-8 gap-2 font-bold text-slate-500 hover:text-primary border-slate-200">
                      外部ビューアーで開く
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
