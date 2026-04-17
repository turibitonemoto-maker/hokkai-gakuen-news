
"use client";

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { PublicHeader } from '@/components/site/public-header';
import { PublicFooter } from '@/components/site/public-footer';
import { SidebarContent } from '@/components/site/sidebar-content';
import { Loader2, Calendar, Tag as TagIcon, ArrowLeft, UserPen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';

const DEFAULT_IMAGE = "https://picsum.photos/seed/hokkai1/1200/800";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const [sanitizedContent, setSanitizedContent] = useState<string>('');
  const hasIncremented = useRef(false);

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'articles', id as string);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(docRef);

  useEffect(() => {
    if (article?.content) {
      setSanitizedContent(DOMPurify.sanitize(article.content, {
        ADD_TAGS: ['a', 'strong', 'em', 'u', 'br', 'p', 'h1', 'h2', 'ul', 'ol', 'li', 'blockquote', 'div', 'img', 'span'],
        ADD_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'data-caption']
      }));
    }
    
    if (firestore && id && article && !isLoading && !hasIncremented.current) {
      const articleRef = doc(firestore, 'articles', id as string);
      updateDoc(articleRef, {
        viewCount: increment(1)
      }).then(() => {
        hasIncremented.current = true;
      });
    }
  }, [article, firestore, id, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black text-slate-800">記事が見つかりません</h2>
          <Link href="/articles"><Button variant="outline">記事一覧へ戻る</Button></Link>
        </div>
      </div>
    );
  }

  const imageUrl = article.mainImageUrl && article.mainImageUrl.trim() !== "" ? article.mainImageUrl : DEFAULT_IMAGE;
  const transform = article.mainImageTransform || { scale: 0, x: 0, y: 0 };
  const reporter = article.authorName || "北海学園大学新聞会";

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-10">
            <Link href="/articles" className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
              <ArrowLeft className="h-4 w-4" /> 記事一覧へ
            </Link>

            <article className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="relative aspect-[21/9] w-full bg-slate-100 overflow-hidden">
                <Image 
                  src={imageUrl} 
                  alt={article.title} 
                  fill 
                  className="transition-transform duration-700"
                  style={{
                    objectFit: "contain",
                    transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`,
                  }}
                  unoptimized
                  data-ai-hint="university building"
                  priority
                />
              </div>

              <div className="p-8 md:p-16">
                <div className="flex flex-wrap items-center gap-6 mb-8">
                  <Badge className="bg-primary text-white font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-wider">
                    {article.categoryId}
                  </Badge>
                  <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {article.publishDate}</span>
                    <span className="flex items-center gap-1.5 text-primary"><UserPen className="h-3.5 w-3.5" /> 記者: {reporter}</span>
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-12 tracking-tighter">
                  {article.title}
                </h1>

                <div 
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />

                <div className="mt-16 pt-10 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    {article.tags?.map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-tight">
                        <TagIcon className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <aside className="lg:col-span-4 hidden lg:block">
            <SidebarContent ads={[]} />
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
