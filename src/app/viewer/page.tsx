"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Loader2, BookOpen, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";

/**
 * 紙面アーカイブ一覧ページ
 * 北海道新聞デジタルのように、日付ごとに紙面をグループ化して表示します。
 */
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

  // 日付（降順）→ 号数（降順）でソートし、日付でグループ化
  const groupedArticles = useMemo(() => {
    if (!articles) return {};
    const sorted = [...articles].sort((a, b) => {
      const dateCompare = b.publishDate.localeCompare(a.publishDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.issueNumber || 0) - (a.issueNumber || 0);
    });
    
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
          <Badge variant="outline" className="mb-4 px-6 py-1.5 border-primary/20 text-primary font-black uppercase tracking-[0.4em] rounded-full bg-slate-50">
            Digital Archive
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-4">
            <BookOpen className="h-10 w-10 text-primary" />
            紙面ビューアー
          </h2>
          <p className="mt-4 text-slate-500 font-bold max-w-2xl mx-auto">
            北海学園大学一部新聞会のバックナンバーを、実際の紙面イメージで公開しています。
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">アーカイブを読込中...</p>
          </div>
        ) : sortedDates.length > 0 ? (
          <div className="space-y-20">
            {sortedDates.map((date) => (
              <section key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-6 mb-10">
                  <div className="bg-[#1e293b] text-white px-6 py-2 rounded-full font-black text-lg shadow-xl flex items-center gap-3">
                    <Calendar className="h-5 w-5" />
                    {new Date(date).toLocaleDateString("ja-JP", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                  {groupedArticles[date].map((article: any) => (
                    <Link key={article.id} href={`/viewer/${article.id}`} className="group">
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full group-hover:-translate-y-2">
                        <div className="relative aspect-[3/4.2] bg-slate-50 overflow-hidden border-b-4 border-slate-50">
                          {article.mainImageUrl ? (
                            <Image src={article.mainImageUrl} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                              <BookOpen className="h-16 w-16 opacity-10" />
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary/90 backdrop-blur-md border-none font-black px-3 py-1 rounded-lg shadow-lg">
                              第 {article.issueNumber} 号
                            </Badge>
                          </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col justify-between">
                          <h4 className="font-black text-slate-800 leading-snug group-hover:text-primary transition-colors text-lg line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="mt-6 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-primary/20 pl-2">Digital Edition</span>
                            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100">
            <BookOpen className="h-20 w-20 mx-auto text-slate-200 mb-6 opacity-50" />
            <p className="text-2xl font-black text-slate-400">現在、公開されている紙面はありません。</p>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
