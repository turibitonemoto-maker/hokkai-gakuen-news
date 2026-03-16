
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Loader2, Calendar, ArrowLeft, User, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "キャンパス",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
};

/**
 * 記事詳細公開ページ
 * デネブより：最高司令官、ベガさんの執筆した美しい記事をここで完全再現します。
 */
export default function ArticleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const [sanitizedContent, setSanitizedContent] = useState<string>('');

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "articles", id as string);
  }, [firestore, id]);

  const { data: article, isLoading } = useDoc(docRef);

  useEffect(() => {
    if (article?.content) {
      setSanitizedContent(DOMPurify.sanitize(article.content));
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
      </div>
    );
  }

  if (!article || !article.isPublished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <h2 className="text-2xl font-black text-slate-400 mb-4">記事が見つかりません</h2>
        <Button onClick={() => router.push('/articles')} className="font-bold rounded-xl">記事一覧へ戻る</Button>
      </div>
    );
  }

  const transform = article.mainImageTransform || { scale: 0, x: 0, y: 0 };

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <PublicHeader />

      <main className="flex-1 pb-24">
        {/* 記事ヘッダー */}
        <div className="bg-slate-50 border-b py-12 md:py-20">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2 font-bold text-slate-400 hover:text-primary">
                <ArrowLeft className="h-4 w-4 mr-1" /> 戻る
              </Button>
              <Badge className="bg-primary text-white font-black px-4 py-1 rounded-full shadow-md border-none">
                {CATEGORY_LABELS[article.categoryId] || article.categoryId}
              </Badge>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {article.publishDate}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-800 leading-tight tracking-tighter">
              {article.title}
            </h1>

            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
              <User className="h-4 w-4" />
              <span>北海学園大学一部新聞会</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 mt-12 md:mt-20">
          {/* アイキャッチ画像 */}
          {article.mainImageUrl && (
            <div className="space-y-4 mb-16 animate-in fade-in zoom-in duration-700">
              <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
                <Image 
                  src={article.mainImageUrl} 
                  alt={article.title} 
                  fill 
                  className="object-cover"
                  style={{
                    transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                    transition: 'transform 0.1s linear'
                  }}
                  priority
                  unoptimized
                />
              </div>
              {article.imageCaption && (
                <p className="text-center text-slate-400 text-xs font-bold italic flex items-center justify-center gap-2">
                  <MessageCircle className="h-3 w-3" /> {article.imageCaption}
                </p>
              )}
            </div>
          )}

          {/* 記事本文 */}
          <article 
            className="article-content prose prose-slate max-w-none prose-headings:font-black prose-p:leading-[1.6] prose-p:text-slate-700 animate-in slide-in-from-bottom-8 duration-1000"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <div className="mt-24 border-t pt-12 flex justify-center">
            <Button variant="outline" onClick={() => router.push('/articles')} className="h-14 px-10 rounded-full font-black text-slate-500 border-slate-200 hover:bg-slate-50 transition-all group">
              <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-2 transition-transform" />
              すべての記事を見る
            </Button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
