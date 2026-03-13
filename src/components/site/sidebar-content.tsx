
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MessageCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { increment } from 'firebase/firestore';

export function SidebarContent({ ads }: { ads: any[] }) {
  const firestore = useFirestore();
  const presidentRef = useMemoFirebase(() => doc(firestore, 'settings', 'president-message'), [firestore]);
  const { data: president } = useDoc(presidentRef);

  const handleAdClick = (ad: any) => {
    if (!firestore) return;
    const adRef = doc(firestore, 'ads', ad.id);
    updateDocumentNonBlocking(adRef, { clickCount: increment(1) });
  };

  return (
    <div className="space-y-10 sticky top-28">
      {/* 会長挨拶セクション */}
      {president && (
        <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              会長挨拶
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden shadow-md mb-4 border-2 border-white">
                <Image
                  src={president.authorImageUrl || "https://picsum.photos/seed/president/200/200"}
                  alt={president.authorName}
                  fill
                  className="object-cover"
                />
              </div>
              <h4 className="font-bold text-slate-800 text-lg">{president.authorName}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">会長 / 会長職</p>
            </div>
            <div className="relative">
              <MessageCircle className="absolute -top-2 -left-2 h-6 w-6 text-primary/10" />
              <p className="text-sm text-slate-600 leading-relaxed italic text-center px-4">
                「{president.content?.slice(0, 120)}...」
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 広告エリア */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">スポンサー</h3>
        </div>
        <div className="space-y-4">
          {ads.map((ad) => (
            <a 
              key={ad.id} 
              href={ad.linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => handleAdClick(ad)}
              className="block group"
            >
              <div className="relative h-28 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-200">
                <Image
                  src={ad.imageUrl}
                  alt={ad.title}
                  fill
                  className="object-contain p-2 bg-white group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 text-center truncate">{ad.title}</p>
            </a>
          ))}
          {ads.length === 0 && (
            <div className="h-28 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
              <p className="text-[10px] text-slate-300 font-bold uppercase">No Ads</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
