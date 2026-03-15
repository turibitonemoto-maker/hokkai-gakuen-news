
"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, FileType, ExternalLink, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PaperViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-4">データが見つかりません</h2>
        <Button onClick={() => router.push('/viewer')} className="rounded-xl font-bold">
          アーカイブへ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-body">
      <PublicHeader />

      <main className="flex-1 flex flex-col">
        <div className="bg-white border-b py-8 md:py-12 shadow-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/viewer')}
                  className="rounded-full hover:bg-slate-100 -ml-2 text-slate-500 font-bold"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> アーカイブ一覧へ
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm">
                    {article.title}
                  </Badge>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <Calendar className="h-4 w-4" />
                    {article.publishDate}
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {article.title}
                </h1>
              </div>

              {article.pdfUrl && (
                <div className="flex gap-3">
                  <Button asChild className="rounded-2xl h-14 px-8 font-black shadow-lg hover:scale-105 transition-transform">
                    <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 mr-3" />
                      別ウィンドウで開く
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-200/50 p-4 md:p-8 flex items-center justify-center">
          {article.pdfUrl ? (
            <div className="w-full max-w-6xl aspect-[1/1.4] md:h-[1200px] bg-white shadow-2xl rounded-3xl overflow-hidden border-8 border-white animate-in zoom-in fade-in duration-1000">
              <iframe 
                src={`${article.pdfUrl.replace('/view', '/preview')}`}
                className="w-full h-full border-none"
                title={article.title}
              />
            </div>
          ) : (
            <div className="text-center py-32 space-y-4">
              <FileType className="h-20 w-20 mx-auto text-slate-300 opacity-20" />
              <p className="text-slate-400 font-black italic">PDFデータがリンクされていません。</p>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
