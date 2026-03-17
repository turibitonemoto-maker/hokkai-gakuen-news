
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Loader2, Upload, Maximize, MoveHorizontal, MoveVertical } from "lucide-react";
import Image from "next/image";

const adSchema = z.object({
  title: z.string().min(1, "広告名を入力してください"),
  imageUrl: z.string().min(1, "画像データが必要です"),
  imageTransform: z.object({
    scale: z.number().default(0),
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ scale: 0, x: 0, y: 0 }),
  linkUrl: z.string().url("有効な遷移先URLを入力してください"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type AdFormValues = z.infer<typeof adSchema>;

interface AdFormProps {
  ad?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdForm({ ad, onSuccess, onCancel }: AdFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };
  
  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: ad?.title || "",
      imageUrl: ad?.imageUrl || "",
      imageTransform: ad?.imageTransform || { scale: 0, x: 0, y: 0 },
      linkUrl: ad?.linkUrl || "",
      startDate: ad?.startDate || new Date().toISOString().slice(0, 16),
      endDate: ad?.endDate || "",
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const titleValue = form.getValues("title");
    if (!titleValue) {
      toast({ variant: "destructive", title: "先に広告名を入力してください", description: "フォルダを作成するために名前が必要です。" });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const subFolder = sanitizeFolderName(titleValue);
      const formData = new FormData();
      formData.append("file", file);
      // フラット化：newspaper_archive/タイトルの直下へ
      formData.append("folder", `newspaper_archive/${subFolder}`);
      
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      form.setValue("imageUrl", data.secure_url);
      toast({ title: "バナーを取り込みました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗" });
    } finally {
      setIsProcessing(false);
    }
  };

  function onSubmit(values: AdFormValues) {
    if (!firestore) return;

    if (ad?.id) {
      const docRef = doc(firestore, "ads", ad.id);
      setDocumentNonBlocking(docRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "更新完了" });
    } else {
      const colRef = collection(firestore, "ads");
      addDocumentNonBlocking(colRef, { 
        ...values, 
        clickCount: 0,
        createdAt: serverTimestamp() 
      });
      toast({ title: "広告を登録しました" });
    }
    onSuccess();
  }

  const imageUrl = form.watch("imageUrl");
  const transform = form.watch("imageTransform");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">広告名</FormLabel>
              <FormControl><Input className="h-12 rounded-xl font-bold" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">バナー画像</FormLabel>
                  <div className="flex gap-2">
                    <FormControl><Input className="h-12 rounded-xl font-bold bg-slate-50" readOnly {...field} /></FormControl>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-6 rounded-xl gap-2 font-black"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      画像選択
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            {imageUrl && (
              <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Maximize className="h-3 w-3" /> 画像構図管制
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500">倍率 (中央: 0%)</label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                        {transform.scale.toFixed(0)}%
                      </span>
                    </div>
                    <Slider 
                      min={-200} 
                      max={200} 
                      step={0.1} 
                      value={[transform.scale]} 
                      onValueChange={([val]) => form.setValue("imageTransform.scale", val)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <MoveHorizontal className="h-3 w-3" /> 水平移動 (中央: 0)
                      </label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.x.toFixed(0)}%</span>
                    </div>
                    <Slider 
                      min={-200} 
                      max={200} 
                      step={0.1} 
                      value={[transform.x]} 
                      onValueChange={([val]) => form.setValue("imageTransform.x", val)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <MoveVertical className="h-3 w-3" /> 垂直移動 (中央: 0)
                      </label>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{transform.y.toFixed(0)}%</span>
                    </div>
                    <Slider 
                      min={-200} 
                      max={200} 
                      step={0.1} 
                      value={[transform.y]} 
                      onValueChange={([val]) => form.setValue("imageTransform.y", val)} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">仕上がりプレビュー</label>
            <div className="relative h-28 rounded-2xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
              {imageUrl ? (
                <Image 
                  src={imageUrl} 
                  alt="Preview" 
                  fill 
                  className="object-cover"
                  style={{
                    transform: `scale(${Math.max(0.01, 1 + transform.scale / 100)}) translate(${transform.x}%, ${transform.y}%)`,
                    transition: 'transform 0.1s linear',
                    willChange: 'transform'
                  }}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs">バナーを選択してください</div>
              )}
            </div>
            <p className="text-[8px] text-slate-400 font-bold uppercase text-center tracking-widest mt-2">
              ※広告枠での実際の見え方です
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">遷移先URL</FormLabel>
              <FormControl><Input className="h-12 rounded-xl font-bold" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl h-12 font-bold">キャンセル</Button>
          <Button type="submit" className="rounded-xl h-12 px-10 font-black bg-primary shadow-lg hover:scale-105 transition-transform">
            保存する
          </Button>
        </div>
      </form>
    </Form>
  );
}
