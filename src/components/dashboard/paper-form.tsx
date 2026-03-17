
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CloudUpload, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const paperSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  pdfUrl: z.string().min(1, "PDFファイルをアップロードしてください"),
  mainImageUrl: z.string().optional(),
  isPublished: z.boolean().default(true),
});

type PaperFormValues = z.infer<typeof paperSchema>;

export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      pdfUrl: paper?.pdfUrl || "",
      mainImageUrl: paper?.mainImageUrl || "",
      isPublished: paper?.isPublished ?? true,
    },
  });

  const watchedPdfUrl = form.watch("pdfUrl");
  const watchedMainImageUrl = form.watch("mainImageUrl");

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast({ variant: "destructive", title: "エラー", description: "PDFファイルを選択してください。" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", { 
        method: "POST", 
        body: formData 
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.details || responseData.error || "アップロードに失敗しました");
      }
      
      // CloudinaryのPDF URLをセット
      const pdfUrl = responseData.secure_url;
      form.setValue("pdfUrl", pdfUrl);

      // CloudinaryはPDFのURLの拡張子を.jpgに変えるだけで1ページ目のサムネイルを取得できる
      const thumbnailUrl = pdfUrl.replace(/\.pdf$/, ".jpg");
      form.setValue("mainImageUrl", thumbnailUrl);

      toast({ title: "PDFの取り込みに成功しました" });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "アップロード失敗", 
        description: error.message 
      });
    } finally {
      setIsUploading(null as any);
      setIsUploading(false);
    }
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    
    const data = {
      title: values.title,
      publishDate: values.publishDate,
      pdfUrl: values.pdfUrl,
      mainImageUrl: values.mainImageUrl,
      articleType: "Standard",
      categoryId: "Viewer", 
      isPublished: values.isPublished,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 max-w-4xl mx-auto pb-20">
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
              <FileText className="h-5 w-5 text-primary" />
              PDFアーカイブ・ファイル
            </h3>
          </div>

          <div 
            className={cn(
              "relative min-h-[300px] border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center p-10 group cursor-pointer overflow-hidden",
              watchedPdfUrl ? "border-green-100 bg-green-50/30" : "border-slate-200 bg-white hover:border-primary/30"
            )}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".pdf,application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
              }}
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <CloudUpload className="absolute inset-0 m-auto h-8 w-8 text-primary animate-bounce" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-primary uppercase tracking-tighter">Uploading PDF...</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">サーバー管制室へ送信中。しばらくお待ちください。</p>
                </div>
              </div>
            ) : watchedPdfUrl ? (
              <div className="flex flex-col md:flex-row items-center gap-10 w-full max-w-2xl animate-in fade-in zoom-in duration-500">
                <div className="relative h-64 w-44 rounded-2xl shadow-2xl border-4 border-white overflow-hidden bg-white shrink-0 group-hover:scale-105 transition-transform">
                  {watchedMainImageUrl ? (
                    <Image src={watchedMainImageUrl} alt="Preview" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50"><FileText className="h-12 w-12 text-slate-200" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-8 w-8 text-white" />
                    <span className="text-white text-[10px] font-black uppercase">ファイルを入れ替え</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="text-xl font-black tracking-tighter">Ready to Deploy</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">File Address</p>
                    <p className="text-xs font-mono text-slate-500 break-all">{watchedPdfUrl}</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/5 font-bold gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      form.setValue("pdfUrl", "");
                      form.setValue("mainImageUrl", "");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    選択を解除
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-slate-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                  <CloudUpload className="h-10 w-10 text-slate-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-black text-slate-800 tracking-tight">PDFファイルをドロップ、または選択</p>
                  <p className="text-sm font-bold text-slate-400">1つのファイルで全てのページを網羅してください。</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-primary bg-primary/5 px-4 py-2 rounded-full mx-auto w-fit border border-primary/10">
                  <AlertCircle className="h-3 w-3" />
                  推奨: 50MB以下のPDFファイル
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-10 border-t sticky bottom-6 z-20">
          <Button 
            type="submit" 
            disabled={!watchedPdfUrl || isUploading}
            className="w-full h-16 shadow-2xl font-black rounded-2xl text-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            紙面アーカイブを保存する
          </Button>
        </div>
      </form>
    </Form>
  );
}
