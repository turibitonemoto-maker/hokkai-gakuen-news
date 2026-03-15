
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Loader2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";

/**
 * About Us 公開ページ（表示用サイト）
 * 命令に基づき、settings/about の content フィールドのみを映し出す「純粋な鏡」として機能します。
 */
export default function AboutPage() {
  const firestore = useFirestore();
  const [sanitizedContent, setSanitizedContent] = useState<string>('');

  const docRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "settings", "about");
  }, [firestore]);

  const { data: aboutData, isLoading } = useDoc(docRef);

  useEffect(() => {
    if (aboutData?.content) {
      setSanitizedContent(DOMPurify.sanitize(aboutData.content));
    } else {
      setSanitizedContent('');
    }
  }, [aboutData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
      </div>
    );
  }

  // データが空（未入力）の状態判定
  const isEmpty = !aboutData || !aboutData.content || aboutData.content === '<p></p>' || aboutData.content === '';

  return (
    <div className="min-h-screen flex flex-col bg-white font-body animate-in fade-in duration-1000">
      <PublicHeader />

      <main className="flex-1">
        {/* ヘッダーセクション */}
        <div className="bg-slate-50 py-12 border-b">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/20 text-primary font-black uppercase tracking-[0.3em] rounded-full bg-white shadow-sm">
              About Us
            </Badge>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hokkai Gakuen University Evening Newspaper Association</p>
          </div>
        </div>

        {/* コンテンツセクション */}
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          {isEmpty ? (
            <div className="text-center space-y-6 py-20">
              <Info className="h-16 w-16 text-slate-200 mx-auto" />
              <h2 className="text-2xl font-black text-slate-400">About Us は準備中です</h2>
              <p className="text-slate-400 font-bold text-sm">管理画面より組織紹介を記述してください。</p>
            </div>
          ) : (
            <article 
              className="article-content prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:leading-[1.8] prose-p:text-slate-700"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
