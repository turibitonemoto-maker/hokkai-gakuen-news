
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";

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
    }
  }, [aboutData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
      </div>
    );
  }

  if (!aboutData || !aboutData.content) {
    return (
      <div className="min-h-screen flex flex-col bg-white font-body">
        <PublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="h-16 w-16 text-slate-200 mb-6" />
          <h2 className="text-2xl font-black text-slate-800">情報が準備中です</h2>
          <p className="text-slate-500 mt-2 font-bold">現在、About Us の情報を整理しています。</p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <PublicHeader />

      <main className="flex-1">
        <div className="bg-slate-50 py-16 md:py-24 border-b">
          <div className="max-w-4xl mx-auto px-6 text-center md:text-left">
            <Badge variant="outline" className="mb-6 px-4 py-1 border-primary/20 text-primary font-black uppercase tracking-[0.3em] rounded-full">
              About Us
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
              北海学園大学一部新聞会とは
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <article 
            className="article-content prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
