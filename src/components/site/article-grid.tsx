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

// HTMLタグを除去して純粋なテキストのみを抽出するユーティリティ
function stripHtmlTags(html: string) {
  if (!html) return "";
  // HTMLタグを削除し、改行や空白を正規化
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function ArticleGrid({ articles }: { articles: any[] }) {
  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-medium">現在、公開されている記事はありません。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
      <div className="relative h-52 overflow-hidden bg-slate-50">
        {hasImage ? (
          <Image
            src={article.mainImageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            unoptimized={isNote}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 gap-2">
            <ImageOff className="h-10 w-10 opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">No Image</span>
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className={cn(
            "font-bold px-3 py-1 shadow-md",
            isNote ? "bg-purple-600" : "bg-primary"
          )}>
            {isNote ? "note" : CATEGORY_LABELS[article.categoryId] || article.categoryId}
          </Badge>
        </div>
        {isNote && (
          <div className="absolute top-4 right-4">
            <div className="bg-white/90 p-1.5 rounded-full shadow-md">
              <Share2 className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">
          <Calendar className="h-3 w-3" />
          {article.publishDate}
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {article.title}
        </h3>

        <p className="text-sm text-slate-500 line-clamp-3 mb-6 leading-relaxed">
          {textSnippet || "この記事の概要は現在準備中です。"}
        </p>

        <div className="mt-auto">
          {isNote ? (
            <a 
              href={article.noteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:gap-3 transition-all"
            >
              noteで続きを読む
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link 
              href={`/articles/${article.id}`}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all"
            >
              詳細を見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}