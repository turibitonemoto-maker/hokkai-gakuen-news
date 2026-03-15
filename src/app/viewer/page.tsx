
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Loader2, BookOpen, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";

export default function ViewerListPage() {
  const firestore = useFirestore();

  const viewerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "papers"),
      where("isPublished", "==", true)
    );
  }, [firestore]);

  const { data: papers, isLoading } = useCollection(viewerQuery);

  const groupedPapers = useMemo(() => {
    if (!papers) return {};
    
    const sorted = [...papers].sort((a, b) => {
      const dateCompare = b.publishDate.localeCompare(a.publishDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.issueNumber || 0) - (a.issueNumber || 0);
    });

    const groups: Record<string, typeof papers> = {};
    sorted.forEach(paper => {
      const date = paper.publishDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(paper);
    });
    
    return groups;
  }, [papers]);

  const dates = useMemo(() => Object.keys(groupedPapers).sort((a, b) => b.localeCompare(a)), [groupedPapers]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      
      <main className="flex-1 bg-slate-50">
        <div className="bg-white border-b py-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-4 px-6 py-1 border-primary/20 text-primary font-black uppercase tracking-[0.3em] rounded-full shadow-sm">
              Digital Archive
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter flex items-center justify-center gap-4">
              <BookOpen className="h-12 w-12 text-primary" />
              紙面ビューアー
            </h2>
            <p className="mt-4 text-slate-400 font-bold text-sm tracking-widest uppercase">Hokkai Gakuen University Newspaper</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-20">
          {isLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary/30" /></div>
          ) : dates.length > 0 ? (
            dates.map(date => (
              <section key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-px flex-1 bg-slate-200" />
                  <h3 className="text-xl font-black text-slate-400 flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border">
                    <Calendar className="h-5 w-5" />
                    {new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {groupedPapers[date].map((paper) => {
                    const thumbnail = paper.mainImageUrl || (paper.paperImages && paper.paperImages[0]);
                    return (
                      <Link key={paper.id} href={`/viewer/${paper.id}`} className="group">
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full transform hover:scale-[1.02]">
                          <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                            {thumbnail ? (
                              <Image 
                                src={thumbnail} 
                                alt={paper.title} 
                                fill 
                                className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                                unoptimized 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-200"><BookOpen className="h-16 w-16 opacity-20" /></div>
                            )}
                            <div className="absolute top-6 left-6">
                              <Badge className="bg-primary/90 backdrop-blur-md text-white font-black px-4 py-1.5 shadow-xl border-none rounded-full text-xs">
                                第 {paper.issueNumber} 号
                              </Badge>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                          </div>
                          <div className="p-8 flex-1 flex flex-col bg-white">
                            <h4 className="font-black text-slate-800 line-clamp-2 mb-6 group-hover:text-primary transition-colors tracking-tighter text-lg leading-tight">{paper.title}</h4>
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" /> {paper.paperImages?.length || 0} Pages
                              </span>
                              <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 duration-300">
                                <ArrowRight className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="py-40 text-center space-y-6">
              <BookOpen className="h-24 w-24 mx-auto text-slate-200 opacity-20" />
              <p className="text-slate-300 font-black italic text-xl tracking-[0.2em] uppercase">No Archives Available</p>
            </div>
          )}
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
