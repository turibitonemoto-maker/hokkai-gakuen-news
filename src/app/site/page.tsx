
"use client";

import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy } from "firebase/firestore";
import { Loader2, ShieldAlert, Globe, Newspaper, ExternalLink, Calendar, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function DisplaySite() {
  const firestore = useFirestore();

  // メンテナンス設定を監視
  const maintenanceDocRef = useMemoFirebase(() => 
    firestore ? doc(firestore, "settings", "maintenance") : null, 
  [firestore]);
  const { data: maintenanceConfig, isLoading: isConfigLoading } = useDoc(maintenanceDocRef);

  // 記事データを取得
  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "articles"), 
      where("isPublished", "==", true),
      orderBy("publishDate", "desc")
    );
  }, [firestore]);
  const { data: articles, isLoading: isArticlesLoading } = useCollection(articlesQuery);

  // ヒーロー画像を取得
  const heroQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, "hero-images") : null, 
  [firestore]);
  const { data: heroImages } = useCollection(heroQuery);

  if (isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // メンテナンスモードの場合の表示
  if (maintenanceConfig?.isMaintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e293b] text-white p-6">
        <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="bg-destructive/20 p-6 rounded-full ring-8 ring-destructive/10 animate-pulse">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">メンテナンス中です</h1>
            <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-wrap">
              {maintenanceConfig.maintenanceMessage}
            </p>
          </div>
          <div className="pt-8 border-t border-slate-700">
            <p className="text-sm text-slate-500 uppercase tracking-widest">Hokkai Gakuen News 1</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ナビゲーション */}
      <header className="h-20 border-b border-slate-100 flex items-center px-6 md:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <Newspaper className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">HOKKAI GAKUEN NEWS 1</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">最新ニュース</button>
            <button className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">インタビュー</button>
            <button className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">コラム</button>
            <Button variant="outline" className="rounded-full font-bold">お問い合わせ</Button>
          </nav>
        </div>
      </header>

      <main className="pb-24">
        {/* ヒーローセクション */}
        {heroImages && heroImages.length > 0 && (
          <section className="relative h-[400px] md:h-[600px] w-full overflow-hidden">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
              <CarouselContent>
                {heroImages.map((image) => (
                  <CarouselItem key={image.id} className="relative h-[400px] md:h-[600px]">
                    <Image 
                      src={image.imageUrl} 
                      alt={image.title || "Hero Image"} 
                      fill 
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-24">
                      <div className="max-w-4xl space-y-4">
                        <Badge className="bg-primary text-white border-none px-4 py-1">Featured</Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                          {image.title || "北海学園大学一部新聞会より"}
                        </h2>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-8" />
              <CarouselNext className="right-8" />
            </Carousel>
          </section>
        )}

        {/* 記事一覧 */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 mt-16">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full" />
                LATEST ARTICLES
              </h3>
              <p className="text-slate-500 font-medium">北海学園大学の「今」を届ける</p>
            </div>
          </div>

          {isArticlesLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {articles?.map((article) => (
                <Card key={article.id} className="group border-none shadow-none hover:translate-y-[-4px] transition-all duration-300">
                  <CardContent className="p-0 space-y-5">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-100">
                      {article.mainImageUrl ? (
                        <Image 
                          src={article.mainImageUrl} 
                          alt={article.title} 
                          fill 
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Newspaper className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-white/90 text-slate-900 border-none shadow-sm backdrop-blur-sm">
                          {article.categoryId}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-3 px-2">
                      <div className="flex items-center gap-3 text-slate-400 text-xs font-bold">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(article.publishDate).toLocaleDateString("ja-JP")}
                        {article.articleType === "Note" && (
                          <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200 bg-orange-50">
                            note
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                        {article.articleType === "Standard" ? article.content : "note記事で詳細を見る"}
                      </p>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto font-bold text-primary group-hover:gap-2 transition-all"
                        asChild
                      >
                        {article.articleType === "Note" ? (
                          <a href={article.noteUrl} target="_blank" rel="noopener noreferrer">
                            READ MORE <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button>
                            READ MORE <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!articles || articles.length === 0) && (
                <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl text-slate-400 bg-slate-50 font-medium">
                  現在、公開されている記事はありません。
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-slate-900 text-white py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight">HOKKAI GAKUEN NEWS 1</h2>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              北海学園大学一部新聞会が運営する、学生による学生のためのニュースメディアです。
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h5 className="font-bold text-slate-300">カテゴリー</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-white cursor-pointer">学内ニュース</li>
                <li className="hover:text-white cursor-pointer">イベント</li>
                <li className="hover:text-white cursor-pointer">スポーツ</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold text-slate-300">SNS</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-white cursor-pointer">X (Twitter)</li>
                <li className="hover:text-white cursor-pointer">Instagram</li>
                <li className="hover:text-white cursor-pointer">Note</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} 北海学園大学一部新聞会. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
