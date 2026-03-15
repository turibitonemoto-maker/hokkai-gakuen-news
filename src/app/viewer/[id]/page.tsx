"use client";

import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function PaperViewerPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const docRef = id ? doc(firestore, "articles", id as string) : null;
  const { data: article, isLoading } = useDoc(docRef);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>;
  }

  if (!article || article.categoryId !== "Viewer") {
    return <div className="min-h-screen flex flex-col items-center justify-center">データが見つかりません。</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1">
        <div className="bg-white border-b py-8">
          <div className="max-w-7xl mx-auto px-4">
            <Button variant="ghost" onClick={() => router.push('/viewer')} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> 一覧へ戻る</Button>
            <div className="flex items-center gap-3 mb-2">
              <Badge>第 {article.issueNumber} 号</Badge>
              <span className="text-slate-400 text-sm font-bold"><Calendar className="inline h-3 w-3 mr-1" /> {article.publishDate}</span>
            </div>
            <h1 className="text-3xl font-black">{article.title}</h1>
          </div>
        </div>
        <div className="p-4 md:p-10 flex justify-center">
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl overflow-hidden relative aspect-[1/1.414]">
            {article.mainImageUrl ? (
              <Image src={article.mainImageUrl} alt={article.title} fill className="object-contain" unoptimized />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                <BookOpen className="h-20 w-20 mb-4 opacity-20" />
                <p className="font-black italic">画像データがありません</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
