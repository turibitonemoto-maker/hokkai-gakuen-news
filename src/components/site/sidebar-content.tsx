
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
    return doc(firestore, 'settings', 'president_greeting');
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
        <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-widest">
              <User className="h-4 w-4" />
              会長挨拶
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center mb-8">
              <div className="relative h-24 w-24 rounded-[1.5rem] overflow-hidden shadow-xl mb-4 border-2 border-white bg-slate-50">
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
              <h4 className="font-black text-slate-800 text-lg">{president.authorName}</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">北海学園大学一部新聞会 会長</p>
            </div>
            
            <div className="relative">
              <MessageCircle className="absolute -top-4 -left-2 h-8 w-8 text-primary/10" />
              <div 
                className="prose prose-slate prose-sm max-w-none 
                           text-slate-600 font-medium
                           prose-p:leading-7 prose-p:my-4
                           text-center px-4"
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
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sponsors</h3>
          </div>
          <div className="space-y-4">
            {activeAds.map((ad) => {
              const transform = ad.imageTransform || { scale: 1, x: 0, y: 0 };
              return (
                <a 
                  key={ad.id} 
                  href={ad.linkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => handleAdClick(ad)}
                  className="block group"
                >
                  <div className="relative h-28 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 bg-white">
                    <Image
                      src={ad.imageUrl}
                      alt={ad.title || "広告バナー"}
                      fill
                      className="object-cover transition-transform"
                      style={{
                        transform: `scale(${transform.scale}) translate(${transform.x}%, ${transform.y}%)`,
                        willChange: 'transform'
                      }}
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 300px"
                    />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 mt-2 text-center truncate uppercase tracking-tighter">{ad.title}</p>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
