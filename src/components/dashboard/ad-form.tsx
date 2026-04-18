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
import { useState, useRef, useEffect } from "react";
import { Loader2, Upload, Maximize } from "lucide-react";
import Image from "next/image";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  const imageUrl = form.watch("imageUrl");
  const transform = form.watch("imageTransform");

  useEffect(() => {
    if (imageUrl) {
      form.setValue("imageTransform", { scale: 0, x: 0, y: 0 });
    }
  }, [imageUrl, form]);

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const titleValue = form.getValues("title");
    if (!titleValue) {
      toast({ variant: "destructive", title: "先に広告名を入力してください" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ variant: "destructive", title: "写真のデータが大きすぎます", description: "圧縮してください。" });
      return;
    }

    setIsProcessing(true);
    try {
      const subFolder = sanitizeFolderName(titleValue);
      const formData = new FormData();
      formData.append("file", file);
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
      addDocumentNonBlocking(colRef, { ...values, clickCount: 0, createdAt: serverTimestamp() });
      toast({ title: "広告を登録しました" });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 font-body">
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
                    <Button type="button" variant="outline" className="h-12 px-6 rounded-xl gap-2 font-black" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}画像選択
                    </Button>
                  </div>
                </FormItem>
              )}
            />
            {imageUrl && (
              <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Maximize className="h-3 w-3" /> 画像構図調整</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-slate-500">倍率: {transform.scale.toFixed(0)}%</label></div>
                    <Slider min={-200} max={200} step={1} value={[transform.scale]} onValueChange={([val]) => form.setValue("imageTransform.scale", val)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-slate-500">水平: {transform.x.toFixed(0)}%</label></div>
                    <Slider min={-200} max={200} step={1} value={[transform.x]} onValueChange={([val]) => form.setValue("imageTransform.x", val)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-slate-500">垂直: {transform.y.toFixed(0)}%</label></div>
                    <Slider min={-200} max={200} step={1} value={[transform.y]} onValueChange={([val]) => form.setValue("imageTransform.y", val)} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">プレビュー</label>
            <div className="relative h-28 rounded-2xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center">
              {imageUrl ? (
                <Image src={imageUrl} alt="Preview" fill className="transition-transform duration-100" style={{ objectFit: "contain", transform: `translate(${transform.x}%, ${transform.y}%) scale(${Math.max(0.01, 1 + transform.scale / 100)})`, willChange: 'transform' }} unoptimized />
              ) : (
                <div className="text-slate-300 italic text-xs">バナーを選択してください</div>
              )}
            </div>
          </div>
        </div>
        <FormField control={form.control} name="linkUrl" render={({ field }) => (
          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">遷移先URL</FormLabel><FormControl><Input className="h-12 rounded-xl font-bold" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl h-12 font-bold">キャンセル</Button>
          <Button type="submit" className="rounded-xl h-12 px-10 font-black bg-primary shadow-lg">保存する</Button>
        </div>
      </form>
    </Form>
  );
}
