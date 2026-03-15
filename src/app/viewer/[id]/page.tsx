
"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, BookOpen, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useState } from "react";

/**
 * 紙面ビューアー詳細ページ（JPEG対応版）
 * 司令官が登録したJPEG画像を、道新スタイルの高品質なタイポグラフィと共に表示します。
 */
export default function PaperViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const [isZoomed, setIsZoomed] = useState(false);

  const docRef = id ? doc(firestore, "articles", id as string) : null;
  const { data: article, isLoading } = useDoc(docRef);

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
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      <PublicHeader />
      
      <main className="flex-1">
        <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => router.push('/viewer')} className="h-8 px-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft className="h-4 w-4 mr-1" /> 一覧へ
                  </Button>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black px-3 rounded-full">
                    第 {article.issueNumber} 号
                  </Badge>
                  <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {article.publishDate}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{article.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className={cn("rounded-xl font-bold h-10 transition-all", isZoomed ? "bg-primary text-white" : "bg-white")}
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  {isZoomed ? "標準サイズ" : "拡大表示"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12 flex justify-center animate-in fade-in duration-1000">
          <div 
            className={cn(
              "w-full transition-all duration-500 bg-white shadow-2xl rounded-2xl overflow-hidden relative",
              isZoomed ? "max-w-7xl" : "max-w-4xl"
            )}
          >
            {article.mainImageUrl ? (
              <div className="relative w-full aspect-[1/1.414]">
                <Image 
                  src={article.mainImageUrl} 
                  alt={article.title} 
                  fill 
                  className="object-contain" 
                  unoptimized 
                  priority
                />
              </div>
            ) : (
              <div className="aspect-[1/1.414] w-full flex flex-col items-center justify-center text-slate-200">
                <BookOpen className="h-24 w-24 mb-6 opacity-10" />
                <p className="font-black italic text-lg opacity-20">NO PAPER IMAGE</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

import { cn } from "@/lib/utils";
