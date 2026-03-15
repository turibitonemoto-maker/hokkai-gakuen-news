
"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, BookOpen, Maximize2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * 紙面ビューアー詳細ページ（マルチページ対応版）
 * Base64画像の読み込みを安定化させるため unoptimized を適用。
 */
export default function PaperViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const [isZoomed, setIsZoomed] = useState(false);

  const docRef = id ? doc(firestore, "articles", id as string) : null;
  const { data: article, isLoading } = useDoc(docRef);

  // 表示するページ配列を整理（空のURLを除外）
  const displayPages = useMemo(() => {
    if (!article) return [];
    const basePages = article.paperImages || (article.mainImageUrl ? [article.mainImageUrl] : []);
    return basePages.filter((url: string) => url && url.trim() !== "");
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
      </div>
    );
  }

  if (!article || article.categoryId !== "Viewer") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-body">
        <BookOpen className="h-16 w-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-black text-slate-400">データが見つかりません</h2>
        <Button variant="link" onClick={() => router.push('/viewer')} className="mt-4 font-bold">アーカイブ一覧へ</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-body">
      <PublicHeader />
      
      <main className="flex-1">
        <div className="bg-white/80 backdrop-blur-md border-b sticky top-16 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/viewer')} className="h-8 px-2 hover:bg-slate-100 rounded-lg font-bold text-slate-500">
                    <ArrowLeft className="h-4 w-4 mr-1" /> アーカイブ
                  </Button>
                  <Badge className="bg-primary text-white font-black px-3 rounded-full shadow-sm border-none">
                    第 {article.issueNumber} 号
                  </Badge>
                  <span className="text-slate-400 text-[10px] font-black flex items-center gap-1 uppercase tracking-widest">
                    <Calendar className="h-3 w-3" /> {article.publishDate}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">{article.title}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-widest">{displayPages.length} ページ構成</span>
                </div>
                <Button 
                  variant="outline" 
                  className={cn("rounded-xl font-black h-10 transition-all shadow-sm border-slate-200", isZoomed ? "bg-primary text-white border-primary" : "bg-white text-slate-600 hover:bg-slate-50")}
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  {isZoomed ? "標準サイズ" : "拡大表示"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 animate-in fade-in duration-1000">
          {displayPages.length > 0 ? (
            <div className={cn(
              "flex flex-col items-center gap-12 transition-all duration-500",
              isZoomed ? "w-full" : "max-w-4xl mx-auto"
            )}>
              {displayPages.map((pageUrl: string, index: number) => (
                <div 
                  key={index}
                  className="w-full bg-white shadow-2xl rounded-2xl overflow-hidden relative border border-slate-200/50 group"
                >
                  <div className="absolute top-6 left-6 z-10">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-slate-500 font-black shadow-lg border-none px-4 py-1 rounded-full text-xs">P.{index + 1}</Badge>
                  </div>
                  <div className="relative w-full aspect-[1/1.414] bg-slate-50">
                    <Image 
                      src={pageUrl} 
                      alt={`${article.title} - Page ${index + 1}`} 
                      fill 
                      className="object-contain" 
                      unoptimized 
                      priority={index === 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-slate-200">
              <BookOpen className="h-24 w-24 mb-6 opacity-10" />
              <p className="font-black italic text-lg opacity-20 uppercase tracking-widest">No Paper Content Available</p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
