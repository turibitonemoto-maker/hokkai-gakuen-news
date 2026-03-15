
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, RefreshCw, Plus, Trash2, ChevronUp, ChevronDown, Maximize, MoveHorizontal, MoveVertical } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const paperSchema = z.object({
  issueNumber: z.number().min(1, "号数を入力してください"),
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  mainImageTransform: z.object({
    scale: z.number().default(0),
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ scale: 0, x: 0, y: 0 }),
  pages: z.array(z.object({
    url: z.string().min(1, "画像を選択してください")
  })).min(1, "少なくとも1ページは必要です"),
  isPublished: z.boolean().default(true),
});

type PaperFormValues = z.infer<typeof paperSchema>;

export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  
  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      issueNumber: paper?.issueNumber || 0,
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      mainImageTransform: paper?.mainImageTransform || { scale: 0, x: 0, y: 0 },
      pages: paper?.paperImages?.map((url: string) => ({ url })) || [{ url: "" }],
      isPublished: paper?.isPublished ?? true,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "pages",
  });

  const handleFileUpload = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "エラー", description: "画像ファイルを選択してください。" });
      return;
    }

    setIsProcessing(index);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      form.setValue(`pages.${index}.url`, reader.result as string);
      setIsProcessing(null);
      toast({ title: `${index + 1}ページの画像を取り込みました` });
    };
    reader.onerror = () => {
      setIsProcessing(null);
      toast({ variant: "destructive", title: "失敗" });
    };
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    
    // 空のURLを除去して保存
    const paperImages = values.pages.map(p => p.url).filter(url => url !== "");
    const mainImageUrl = paperImages[0] || "";

    const data = {
      ...values,
      mainImageUrl,
      paperImages,
      pages: undefined, // 不要なネスト構造を解除
      categoryId: "Viewer",
      articleType: "Standard",
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    };

    if (paper?.id) {
      const docRef = doc(firestore, "articles", paper.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({ title: "更新完了", description: `第 ${values.issueNumber} 号を更新しました。` });
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
      toast({ title: "登録完了", description: `第 ${values.issueNumber} 号をアーカイブに登録しました。` });
    }
    onSuccess();
  };

  const pages = form.watch("pages");
  const transform = form.watch("mainImageTransform");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 max-w-5xl mx-auto pb-20">
        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="issueNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">号数</FormLabel>
                <FormControl>
                  <Input type="number" className="h-12 rounded-xl font-bold border-white bg-white shadow-sm" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="publishDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">発行日</FormLabel>
                <FormControl>
                  <Input type="date" className="h-12 rounded-xl font-bold border-white bg-white shadow-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</FormLabel>
                <FormControl>
                  <Input placeholder="例：2025年度 新入生歓迎号" className="h-12 rounded-xl font-bold border-white bg-white shadow-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 表紙の構図管制（ArticleFormと同様のUI） */}
        {pages[0]?.url && (
          <div className="bg-slate-50/30 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Maximize className="h-3 w-3" /> 表紙サムネイル構図管制
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500">倍率 (中央: 0%)</label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.scale.toFixed(0)}%</span>
                    </div>
                    <Slider min={-200} max={200} step={0.1} value={[transform.scale]} onValueChange={([val]) => form.setValue("mainImageTransform.scale", val)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MoveHorizontal className="h-3 w-3" /> 水平移動</label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.x.toFixed(0)}%</span>
                    </div>
                    <Slider min={-200} max={200} step={0.1} value={[transform.x]} onValueChange={([val]) => form.setValue("mainImageTransform.x", val)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MoveVertical className="h-3 w-3" /> 垂直移動</label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.y.toFixed(0)}%</span>
                    </div>
                    <Slider min={-200} max={200} step={0.1} value={[transform.y]} onValueChange={([val]) => form.setValue("mainImageTransform.y", val)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">一覧での見え方</p>
                <div className="relative aspect-[3/4] w-48 rounded-2xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                  <Image 
                    src={pages[0].url} 
                    alt="Preview" 
                    fill 
                    className="object-cover"
                    style={{
                      transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                      transition: 'transform 0.1s linear'
                    }}
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              紙面ページ構成（JPEGアップロード）
            </h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => append({ url: "" })}
              className="rounded-full font-black border-primary/20 text-primary hover:bg-primary/5 px-6"
            >
              <Plus className="h-4 w-4 mr-1" /> ページを追加
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {fields.map((field, index) => (
              <div key={field.id} className="relative group animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {index + 1} {index === 0 && " (表紙)"}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => index > 0 && move(index, index - 1)} disabled={index === 0}><ChevronUp className="h-3 w-3" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => index < fields.length - 1 && move(index, index + 1)} disabled={index === fields.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length === 1}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>

                <div 
                  className={cn(
                    "relative aspect-[1/1.414] border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-white shadow-sm",
                    field.url ? "border-slate-100" : "border-slate-200 hover:border-primary/30"
                  )}
                  onClick={() => document.getElementById(`file-input-${index}`)?.click()}
                >
                  {field.url ? (
                    <div className="relative w-full h-full">
                      <Image src={field.url} alt={`Page ${index + 1}`} fill className="object-contain" unoptimized />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-8 w-8 text-white" />
                        <span className="text-white text-[10px] font-black uppercase">画像を入れ替え</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <Upload className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">画像を選択</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id={`file-input-${index}`}
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(index, file);
                    }} 
                  />
                  {isProcessing === index && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10 border-t sticky bottom-6 z-20">
          <Button type="submit" disabled={isProcessing !== null} className="w-full h-16 shadow-2xl font-black rounded-2xl text-xl bg-primary hover:bg-primary/90 transition-all active:scale-95">
            紙面アーカイブを保存する
          </Button>
        </div>
      </form>
    </Form>
  );
}
