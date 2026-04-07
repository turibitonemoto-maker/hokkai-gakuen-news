"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "キャンパス",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
  Viewer: "紙面ビューアー",
};

// 最高司令官提供のデフォルト画像
const DEFAULT_IMAGE = "https://picsum.photos/seed/hokkai1/1200/800";

function stripHtmlTags(html: string) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ArticleGrid({ articles }: { articles: any[] }) {
  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-20 text-center border-4 border-dashed border-slate-100">
        <p className="text-slate-400 font-black italic">現在、公開されている記事はありません。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function ArticleCard({ article }: { article: any }) {
  const imageUrl = article.mainImageUrl && article.mainImageUrl.trim() !== "" ? article.mainImageUrl : DEFAULT_IMAGE;
  const textSnippet = stripHtmlTags(article.content || "");
  const transform = article.mainImageTransform || { scale: 0, x: 0, y: 0 };

  return (
    <div className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full">
      <div className="relative h-60 overflow-hidden bg-slate-100 flex items-center justify-center">
        <Image
          src={imageUrl}
          alt={article.title}
          fill
          className="transition-transform duration-500 ease-out"
          style={{
            objectFit: "contain",
            transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`,
            willChange: 'transform'
          }}
          unoptimized
          data-ai-hint="university building"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-6 left-6">
          <Badge className="font-black px-4 py-1.5 shadow-lg border-none rounded-full text-[10px] uppercase tracking-wider bg-primary">
            {CATEGORY_LABELS[article.categoryId] || article.categoryId}
          </Badge>
        </div>
      </div>

      <div className="p-8 md:p-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">
          <Calendar className="h-3.5 w-3.5" />
          {article.publishDate}
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 mb-5 line-clamp-2 leading-tight group-hover:text-primary transition-colors tracking-tighter">
          {article.title}
        </h3>

        <p className="text-slate-500 line-clamp-3 mb-8 leading-relaxed font-medium text-sm">
          {textSnippet || "この記事の概要は現在準備中です。"}
        </p>

        <div className="mt-auto">
          <Link 
            href={`/articles/${article.id}`}
            className="inline-flex items-center gap-3 text-xs font-black text-primary hover:gap-5 transition-all uppercase tracking-widest"
          >
            詳しく見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
