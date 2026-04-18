
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
    },
  });

  const imageUrl = form.watch("imageUrl");
  const transform = form.watch("imageTransform");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ variant: "destructive", title: "写真のデータが大きすぎます", description: "圧縮してください。" });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "ads");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      form.setValue("imageUrl", data.secure_url);
      toast({ title: "画像をアップロードしました" });
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
    } else {
      const colRef = collection(firestore, "ads");
      addDocumentNonBlocking(colRef, { ...values, clickCount: 0, createdAt: serverTimestamp() });
    }
    toast({ title: "保存しました" });
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 font-body">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">広告名</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField control={form.control} name="imageUrl" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">バナー画像</FormLabel>
              <div className="flex gap-2">
                <FormControl><Input className="h-12 rounded-xl bg-slate-50" readOnly {...field} /></FormControl>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
            </FormItem>
          )} />
          <div className="relative h-28 rounded-xl overflow-hidden bg-slate-100 border">
            {imageUrl && <Image src={imageUrl} alt="" fill className="object-contain" unoptimized />}
          </div>
        </div>
        <FormField control={form.control} name="linkUrl" render={({ field }) => (
          <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">遷移先URL</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>キャンセル</Button>
          <Button type="submit">保存する</Button>
        </div>
      </form>
    </Form>
  );
}
