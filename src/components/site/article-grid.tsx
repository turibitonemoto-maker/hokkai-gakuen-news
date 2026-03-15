'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Share2, ArrowRight, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  Campus: "学内ニュース",
  Event: "イベント",
  Interview: "インタビュー",
  Sports: "スポーツ",
  Column: "コラム",
  Opinion: "オピニオン",
};

// HTMLタグを安全に除去してスニペットを生成する
function stripHtmlTags(html: string) {
  if (!html) return "";
  // タグを削除し、連続する空白や改行を1つにする
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
  const isNote = article.articleType === 'Note';
  const hasImage = !!article.mainImageUrl && article.mainImageUrl.trim() !== "";
  const textSnippet = stripHtmlTags(article.content || "");

  return (
    <div className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full">
      <div className="relative h-60 overflow-hidden bg-slate-50">
        {hasImage ? (
          <Image
            src={article.mainImageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            unoptimized={isNote}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 gap-2">
            <ImageOff className="h-12 w-12 opacity-10" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-20">No Image</span>
          </div>
        )}
        <div className="absolute top-6 left-6 flex gap-2">
          <Badge className={cn(
            "font-black px-4 py-1.5 shadow-lg border-none rounded-full text-[10px] uppercase tracking-wider",
            isNote ? "bg-purple-600" : "bg-primary"
          )}>
            {isNote ? "note" : CATEGORY_LABELS[article.categoryId] || article.categoryId}
          </Badge>
        </div>
        {isNote && (
          <div className="absolute top-6 right-6">
            <div className="bg-white/95 backdrop-blur-md p-2 rounded-full shadow-lg">
              <Share2 className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        )}
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
          {isNote ? (
            <a 
              href={article.noteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-xs font-black text-purple-600 hover:gap-5 transition-all uppercase tracking-widest"
            >
              Read on note
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link 
              href={`/articles/${article.id}`}
              className="inline-flex items-center gap-3 text-xs font-black text-primary hover:gap-5 transition-all uppercase tracking-widest"
            >
              View Detail
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
