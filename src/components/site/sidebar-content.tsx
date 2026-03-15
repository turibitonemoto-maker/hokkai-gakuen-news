'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MessageCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { increment } from 'firebase/firestore';
import { useMemo, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

export function SidebarContent({ ads }: { ads: any[] }) {
  const firestore = useFirestore();
  const [sanitizedMessage, setSanitizedMessage] = useState<string>('');

  const presidentRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'president-message');
  }, [firestore]);
  
  const { data: president } = useDoc(presidentRef);

  useEffect(() => {
    if (president?.content) {
      setSanitizedMessage(DOMPurify.sanitize(president.content));
    }
  }, [president]);

  const activeAds = useMemo(() => {
    if (!ads) return [];
    const now = new Date();
    return ads.filter(ad => {
      if (ad.startDate && new Date(ad.startDate) > now) return false;
      if (ad.endDate && new Date(ad.endDate) < now) return false;
      return true;
    });
  }, [ads]);

  const handleAdClick = (ad: any) => {
    if (!firestore) return;
    const adRef = doc(firestore, 'ads', ad.id);
    updateDocumentNonBlocking(adRef, { clickCount: increment(1) });
  };

  return (
    <div className="space-y-10 sticky top-28">
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
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden shadow-md mb-4 border-2 border-white bg-slate-50">
                {president.authorImageUrl ? (
                  <Image
                    src={president.authorImageUrl}
                    alt={president.authorName || "会長"}
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <h4 className="font-bold text-slate-800 text-lg">{president.authorName}</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">会長 / 代表職</p>
            </div>
            <div className="relative">
              <MessageCircle className="absolute -top-2 -left-2 h-6 w-6 text-primary/10" />
              <div 
                className="text-sm text-slate-600 leading-relaxed text-center px-4 line-clamp-6 prose-sm prose-slate"
                dangerouslySetInnerHTML={{ __html: sanitizedMessage }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeAds.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">スポンサー</h3>
          </div>
          <div className="space-y-4">
            {activeAds.map((ad) => (
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
                    alt={ad.title || "広告バナー"}
                    fill
                    className="object-contain p-2 bg-white group-hover:scale-105 transition-transform"
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-2 text-center truncate">{ad.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
