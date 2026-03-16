
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { ArticleGrid } from "@/components/site/article-grid";
import { Loader2, Newspaper, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "すべて" },
  { id: "Campus", label: "キャンパス" },
  { id: "Event", label: "イベント" },
  { id: "Interview", label: "インタビュー" },
  { id: "Sports", label: "スポーツ" },
  { id: "Column", label: "コラム" },
  { id: "Opinion", label: "オピニオン" },
];

/**
 * 記事一覧公開ページ
 * デネブより：最高司令官、ここも復旧させました。全記事が整列しております。
 */
export default function ArticlesPage() {
  const firestore = useFirestore();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "articles"),
      where("isPublished", "==", true),
      orderBy("publishDate", "desc")
    );
  }, [firestore]);

  const { data: allArticles, isLoading } = useCollection(articlesQuery);

  const filteredArticles = useMemo(() => {
    if (!allArticles) return [];
    if (selectedCategory === "all") return allArticles;
    return allArticles.filter(a => a.categoryId === selectedCategory);
  }, [allArticles, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-body animate-in fade-in duration-700">
      <PublicHeader />

      <main className="flex-1 bg-slate-50">
        <div className="bg-white border-b py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-4 px-6 py-1 border-primary/20 text-primary font-black uppercase tracking-[0.3em] rounded-full bg-white shadow-sm">
              News & Articles
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter flex items-center justify-center gap-4">
              <Newspaper className="h-12 w-12 text-primary" />
              記事一覧
            </h2>
            <p className="mt-4 text-slate-400 font-bold text-sm tracking-widest uppercase">Hokkai Gakuen News Stream</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* カテゴリーフィルター */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-6 py-2 rounded-full text-xs font-black transition-all border transform hover:translate-y-[-1px]",
                  selectedCategory === cat.id 
                    ? "bg-primary text-white border-transparent shadow-lg scale-105" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-primary/20 hover:text-primary"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary/30" /></div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <ArticleGrid articles={filteredArticles} />
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
