
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ExternalLink, AlertTriangle, Pencil, BarChart3, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { AdForm } from "./ad-form";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const chartConfig = {
  clickCount: {
    label: "閲覧数",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function AdManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [adToDelete, setAdToDelete] = useState<any>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const adsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "ads");
  }, [firestore]);

  const { data: ads, isLoading } = useCollection(adsQuery);

  // グラフ用データの整形
  const chartData = useMemo(() => {
    if (!ads) return [];
    return ads.map(ad => ({
      name: ad.title || "無題",
      clickCount: ad.clickCount || 0,
    })).sort((a, b) => b.clickCount - a.clickCount);
  }, [ads]);

  const totalClicks = useMemo(() => {
    if (!ads) return 0;
    return ads.reduce((sum, ad) => sum + (ad.clickCount || 0), 0);
  }, [ads]);

  const handleAdd = () => {
    setCurrentAd(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (ad: any) => {
    setCurrentAd(ad);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!adToDelete || !firestore) return;
    
    const docRef = doc(firestore, "ads", adToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "広告を削除しました",
      description: `「${adToDelete.title}」を削除しました。`,
    });
    
    setAdToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">広告パフォーマンス管理</h2>
          <p className="text-sm text-slate-500">バナーの閲覧数と統計を確認・管理します。</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          広告を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* アナリティクスセクション */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  閲覧数ランキング
                </CardTitle>
                <CardDescription>各広告の累計クリック数比較</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-4">
                  {chartData.length > 0 ? (
                    <ChartContainer config={chartConfig}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tickLine={false} 
                          axisLine={false}
                          width={100}
                          style={{ fontSize: '12px' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="clickCount" 
                          fill="var(--color-clickCount)" 
                          radius={[0, 4, 4, 0]} 
                          barSize={20}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      データがありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 flex flex-col justify-center items-center text-center p-6">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-slate-500 text-sm font-medium">総閲覧数（全広告合計）</h3>
              <p className="text-4xl font-bold text-primary mt-2">{totalClicks.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-2">※表示用サイトでのクリックを集計</p>
            </Card>
          </div>

          {/* 広告一覧グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads?.map((ad) => (
              <Card key={ad.id} className="overflow-hidden group border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-32 bg-slate-100 border-b">
                  <Image 
                    src={ad.imageUrl} 
                    alt={ad.title || "広告バナー"} 
                    fill 
                    className="object-contain p-2"
                  />
                  <div className="absolute top-2 right-2">
                    <div className="bg-white/90 backdrop-blur-sm border rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Users className="h-3 w-3 text-primary" />
                      {ad.clickCount || 0}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="truncate mr-4">
                    <p className="font-semibold truncate text-slate-800">{ad.title || "無題の広告"}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center mt-1">
                      <ExternalLink className="h-3 w-3 mr-1" /> {ad.linkUrl}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-500 hover:text-primary hover:bg-primary/10" 
                      onClick={() => handleEdit(ad)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10" 
                      onClick={() => setAdToDelete(ad)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {ads?.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-slate-400 bg-white">
                <p className="text-lg font-medium">登録されている広告はありません</p>
                <p className="text-sm">右上の「広告を追加」から登録を開始してください</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* 登録・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentAd ? "広告を編集" : "新しい広告を追加"}</DialogTitle>
            <DialogDescription>
              バナー画像と遷移先のリンクを入力してください。
            </DialogDescription>
          </DialogHeader>
          <AdForm ad={currentAd} onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!adToDelete} onOpenChange={(open) => !open && setAdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>広告を削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              広告「<span className="font-bold text-slate-900">{adToDelete?.title}</span>」を削除します。統計データも失われます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
