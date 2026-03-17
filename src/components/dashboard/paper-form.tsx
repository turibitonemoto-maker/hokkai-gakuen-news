
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileImage, Upload, Trash2, Layers, CheckCircle2, RefreshCw, Plus } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const paperSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  paperImages: z.array(z.string()).min(1, "少なくとも1枚の紙面画像をアップロードしてください"),
  mainImageUrl: z.string().optional(),
});

type PaperFormValues = z.infer<typeof paperSchema>;

export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      paperImages: paper?.paperImages || [],
      mainImageUrl: paper?.mainImageUrl || "",
    },
  });

  const watchedImages = form.watch("paperImages");
  const watchedMainImage = form.watch("mainImageUrl");

  const handleFilesUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    setIsUploading(true);
    setUploadProgress({ current: 0, total: fileArray.length });

    const newUrls: string[] = [...watchedImages];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file.type.startsWith('image/')) continue;

        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/upload", { 
          method: "POST", 
          body: formData 
        });

        if (!res.ok) throw new Error("アップロードに失敗しました");
        const data = await res.json();
        newUrls.push(data.secure_url);
      }

      form.setValue("paperImages", newUrls);
      if (!watchedMainImage && newUrls.length > 0) {
        form.setValue("mainImageUrl", newUrls[0]);
      }

      toast({ title: `${fileArray.length}枚の画像を取り込みました` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "エラー", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = [...watchedImages];
    const removedUrl = newUrls.splice(index, 1)[0];
    form.setValue("paperImages", newUrls);
    
    if (watchedMainImage === removedUrl) {
      form.setValue("mainImageUrl", newUrls[0] || "");
    }
  };

  const setAsMain = (url: string) => {
    form.setValue("mainImageUrl", url);
    toast({ title: "表紙に設定しました" });
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    
    const data = {
      ...values,
      articleType: "Standard",
      categoryId: "Viewer", 
      isPublished: paper?.isPublished ?? true,
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    };

    if (paper?.id) {
      const docRef = doc(firestore, "articles", paper.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({ title: "更新完了" });
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
      toast({ title: "登録完了" });
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 max-w-5xl mx-auto pb-20">
        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              紙面ページ構成（全 {watchedImages.length} ページ）
            </h3>
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-full gap-2 border-primary/20 text-primary font-bold hover:bg-primary/5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              画像を追加
            </Button>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files && handleFilesUpload(e.target.files)} 
            />
          </div>

          {isUploading && (
            <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4">
                <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-black text-primary uppercase">Uploading Pages...</p>
                  <p className="text-[10px] font-bold text-slate-400">一括転送中： {uploadProgress.current} / {uploadProgress.total}</p>
                </div>
              </div>
            </div>
          )}

          {watchedImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchedImages.map((url, index) => (
                <div key={url + index} className={cn(
                  "relative aspect-[1/1.4] rounded-2xl overflow-hidden border-2 transition-all group",
                  watchedMainImage === url ? "border-primary shadow-lg ring-4 ring-primary/10" : "border-slate-100 hover:border-slate-300"
                )}>
                  <Image src={url} alt={`Page ${index + 1}`} fill className="object-cover" unoptimized />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                    P.{index + 1}
                  </div>
                  {watchedMainImage === url && (
                    <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      className="h-7 text-[8px] font-black rounded-full"
                      onClick={() => setAsMain(url)}
                    >
                      表紙にする
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="h-7 w-7 rounded-full"
                      onClick={() => removeImage(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="border-4 border-dashed border-slate-100 rounded-[3rem] p-20 text-center space-y-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-slate-200 mx-auto" />
              <div>
                <p className="text-xl font-black text-slate-300">画像をここにドロップ</p>
                <p className="text-sm font-bold text-slate-200 uppercase tracking-widest mt-1">またはクリックして一括選択</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-10 border-t sticky bottom-6 z-20">
          <Button 
            type="submit" 
            disabled={watchedImages.length === 0 || isUploading}
            className="w-full h-16 shadow-2xl font-black rounded-2xl text-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            紙面アーカイブを保存する
          </Button>
        </div>
      </form>
    </Form>
  );
}
