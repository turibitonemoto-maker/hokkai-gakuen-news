"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, FileType, ExternalLink, ShieldAlert, BookOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * 紙面ビューアー詳細ページ
 * 複数のPDF（本紙、別刷、号外など）を切り替えて表示できます。
 */
export default function PaperViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const [activePdfIndex, setActivePdfIndex] = useState(0);

  const docRef = id ? doc(firestore, "articles", id as string) : null;
  const { data: article, isLoading } = useDoc(docRef);

  // 下位互換性を保ちつつ、複数のPDFリストを作成
  const pdfList = useMemo(() => {
    if (!article) return [];
    const list = [...(article.pdfUrls || [])];
    if (article.pdfUrl && !list.some(p => p.url === article.pdfUrl)) {
      list.unshift({ label: "メイン", url: article.pdfUrl });
    }
    return list;
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-4">データが見つかりません</h2>
        <Button onClick={() => router.push('/viewer')} className="rounded-xl font-bold">アーカイブへ戻る</Button>
      </div>
    );
  }

  const activePdf = pdfList[activePdfIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      <PublicHeader />

      <main className="flex-1 flex flex-col">
        {/* 紙面情報ヘッダー */}
        <div className="bg-white border-b py-8 md:py-12 shadow-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/viewer')}
                  className="rounded-full hover:bg-slate-100 -ml-2 text-slate-500 font-bold"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> アーカイブ一覧へ
                </Button>
                
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-primary px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">
                      第 {article.issueNumber} 号
                    </Badge>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                      <Calendar className="h-4 w-4" /> {article.publishDate}
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                    {article.title}
                  </h1>
                </div>
              </div>

              {/* PDF切り替えタブ */}
              {pdfList.length > 1 && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Layers className="h-3 w-3" /> 紙面を選択
                  </span>
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    {pdfList.map((pdf, index) => (
                      <button
                        key={index}
                        onClick={() => setActivePdfIndex(index)}
                        className={cn(
                          "px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                          activePdfIndex === index ? "bg-white text-primary shadow-md" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {pdf.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PDFビューアー本体 */}
        <div className="flex-1 bg-slate-900/5 p-4 md:p-10 flex flex-col items-center gap-8">
          {activePdf ? (
            <>
              <div className="w-full max-w-6xl aspect-[1/1.4] bg-white shadow-2xl rounded-3xl overflow-hidden border-[12px] border-white animate-in zoom-in fade-in duration-700">
                <iframe 
                  src={`${activePdf.url.includes('firebasestorage') ? activePdf.url : activePdf.url.replace('/view', '/preview')}`}
                  className="w-full h-full border-none"
                  title={activePdf.label}
                />
              </div>
              <Button asChild variant="secondary" className="rounded-full h-14 px-10 font-black shadow-xl hover:scale-105 transition-transform bg-white text-slate-900">
                <a href={activePdf.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5 mr-3" /> 別ウィンドウで高画質表示
                </a>
              </Button>
            </>
          ) : (
            <div className="text-center py-32 space-y-4">
              <BookOpen className="h-20 w-20 mx-auto text-slate-300 opacity-20" />
              <p className="text-slate-400 font-black italic">PDFデータがリンクされていません。</p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
