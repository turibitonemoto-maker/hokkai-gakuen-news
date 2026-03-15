"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Loader2, BookOpen, Calendar } from "lucide-react";
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

  const sortedArticles = useMemo(() => {
    if (!articles) return [];
    return [...articles].sort((a, b) => {
      const dateCompare = b.publishDate.localeCompare(a.publishDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.issueNumber || 0) - (a.issueNumber || 0);
    });
  }, [articles]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Digital Archive</Badge>
          <h2 className="text-4xl font-black flex items-center justify-center gap-4">
            <BookOpen className="h-10 w-10 text-primary" />
            紙面ビューアー
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
        ) : sortedArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {sortedArticles.map((article) => (
              <Link key={article.id} href={`/viewer/${article.id}`} className="group">
                <div className="bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full">
                  <div className="relative aspect-[3/4] bg-slate-50">
                    {article.mainImageUrl ? (
                      <Image src={article.mainImageUrl} alt={article.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><BookOpen className="h-12 w-12" /></div>
                    )}
                    <Badge className="absolute top-4 left-4">第 {article.issueNumber} 号</Badge>
                  </div>
                  <div className="p-6 flex-1">
                    <h4 className="font-black text-slate-800 line-clamp-2 mb-4">{article.title}</h4>
                    <div className="flex items-center text-xs text-slate-400 font-bold">
                      <Calendar className="h-3 w-3 mr-1" /> {article.publishDate}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center text-slate-300 font-black italic">公開されている紙面はありません。</div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
