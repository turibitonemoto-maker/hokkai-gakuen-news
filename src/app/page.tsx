
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { HeroSection } from "@/components/site/hero-section";
import { ArticleGrid } from "@/components/site/article-grid";
import { SidebarContent } from "@/components/site/sidebar-content";
import { Loader2, BookOpen, ArrowRight, Newspaper } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function RootPage() {
  const firestore = useFirestore();

  // インデックス不要のため articles コレクションを全取得してフロントでフィルタ
  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "articles");
  }, [firestore]);

  const heroQuery = useMemoFirebase(() => collection(firestore, "hero-images"), [firestore]);
  const adsQuery = useMemoFirebase(() => collection(firestore, "ads"), [firestore]);

  const { data: allArticles, isLoading: isArticlesLoading } = useCollection(articlesQuery);
  const { data: heroImages } = useCollection(heroQuery);
  const { data: ads } = useCollection(adsQuery);

  // フロント側で公開済みの通常記事を抽出・ソート
  const displayArticles = useMemo(() => {
    if (!allArticles) return [];
    return allArticles
      .filter(a => a.isPublished && a.categoryId !== "Viewer")
      .sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""))
      .slice(0, 6);
  }, [allArticles]);

  // フロント側で最新の紙面を抽出
  const latestPaper = useMemo(() => {
    if (!allArticles) return null;
    const papers = allArticles.filter(a => a.isPublished && a.categoryId === "Viewer");
    return papers.sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""))[0] || null;
  }, [allArticles]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body animate-in fade-in duration-700">
      <PublicHeader />
      
      <main className="flex-1">
        <HeroSection images={heroImages || []} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* メインコンテンツ */}
            <div className="lg:col-span-2 space-y-20">
              
              {/* 最新紙面セクション */}
              {latestPaper && (
                <section className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                      < BookOpen className="h-8 w-8 text-primary" />
                      最新の紙面
                    </h2>
                    <Link href="/viewer">
                      <Button variant="ghost" className="font-bold text-primary gap-2">
                        アーカイブ一覧 <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  
                  <Link href={`/viewer/${latestPaper.id}`} className="block group">
                    <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center transition-all hover:bg-slate-100 hover:shadow-2xl border border-slate-100">
                      <div className="relative w-full md:w-64 aspect-[3/4] bg-white rounded-2xl shadow-xl overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                        {latestPaper.mainImageUrl ? (
                          <Image 
                            src={latestPaper.mainImageUrl} 
                            alt={latestPaper.title} 
                            fill 
                            className="object-cover" 
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <Newspaper className="h-16 w-16 opacity-20" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-primary text-white font-black px-3 py-1 rounded-full shadow-lg">第 {latestPaper.issueNumber} 号</Badge>
                        </div>
                      </div>
                      <div className="flex-1 space-y-6 text-center md:text-left">
                        <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase tracking-[0.2em] bg-white">Digital Archive</Badge>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight group-hover:text-primary transition-colors">{latestPaper.title}</h3>
                        <p className="text-slate-500 font-bold text-sm tracking-widest">{latestPaper.publishDate} 発行</p>
                        <div className="pt-4">
                          <span className="inline-flex items-center gap-2 bg-primary text-white font-black px-8 py-4 rounded-full shadow-xl shadow-primary/20 group-hover:gap-4 transition-all">
                            紙面を開く <ArrowRight className="h-5 w-5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* 最新記事セクション */}
              <section className="space-y-10">
                <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Newspaper className="h-8 w-8 text-primary" />
                    最新のニュース
                  </h2>
                  <Link href="/articles">
                    <Button variant="ghost" className="font-bold text-primary gap-2">
                      記事一覧 <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                
                {isArticlesLoading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
                ) : (
                  <ArticleGrid articles={displayArticles} />
                )}
              </section>
            </div>

            {/* サイドバー */}
            <aside className="lg:col-span-1">
              <SidebarContent ads={ads || []} />
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
