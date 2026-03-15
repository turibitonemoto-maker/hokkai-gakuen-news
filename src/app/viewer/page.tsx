
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Loader2, BookOpen, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";

export default function ViewerListPage() {
  const firestore = useFirestore();

  const viewerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "articles"),
      where("categoryId", "==", "Viewer"),
      where("isPublished", "==", true)
    );
  }, [firestore]);

  const { data: articles, isLoading } = useCollection(viewerQuery);

  // 日付順にソートし、日付ごとにグループ化
  const groupedArticles = useMemo(() => {
    if (!articles) return {};
    const sorted = [...articles].sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    
    return sorted.reduce((acc: any, article) => {
      const date = article.publishDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(article);
      return acc;
    }, {});
  }, [articles]);

  const sortedDates = useMemo(() => Object.keys(groupedArticles).sort((a, b) => b.localeCompare(a)), [groupedArticles]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <PublicHeader />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 md:py-20">
        <div className="mb-16 text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/20 text-primary font-black uppercase tracking-[0.3em] rounded-full">
            Digital Archive
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-4">
            <BookOpen className="h-10 w-10 text-primary" />
            紙面ビューアー
          </h2>
          <p className="mt-4 text-slate-500 font-bold max-w-2xl mx-auto">
            北海学園大学一部新聞会のバックナンバーをデジタル公開しています。
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">アーカイブを読み込み中...</p>
          </div>
        ) : sortedDates.length > 0 ? (
          <div className="space-y-16">
            {sortedDates.map((date) => (
              <section key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-2 bg-primary rounded-full shadow-sm" />
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-slate-400" />
                    {new Date(date).toLocaleDateString("ja-JP", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {groupedArticles[date].map((article: any) => {
                    const transform = article.mainImageTransform || { scale: 0, x: 0, y: 0 };
                    return (
                      <Link key={article.id} href={`/viewer/${article.id}`} className="group">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full group-hover:-translate-y-2">
                          <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden border-b">
                            {article.mainImageUrl ? (
                              <Image 
                                src={article.mainImageUrl} 
                                alt={article.title} 
                                fill 
                                className="object-cover transition-transform duration-700"
                                style={{
                                  transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                                  willChange: 'transform'
                                }}
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                                <BookOpen className="h-12 w-12 opacity-10" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                          </div>
                          <div className="p-6 flex-1 flex flex-col justify-between">
                            <h4 className="font-black text-slate-800 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                              {article.title}
                            </h4>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Edition</span>
                              <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
            <BookOpen className="h-16 w-16 mx-auto text-slate-200 mb-6" />
            <p className="text-xl font-black text-slate-400">現在、公開されている紙面はありません。</p>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
