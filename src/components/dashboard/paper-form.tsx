
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
import { Loader2, Upload, ImageIcon, RefreshCw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const paperSchema = z.object({
  issueNumber: z.number().min(1, "号数を入力してください"),
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  mainImageUrl: z.string().min(1, "紙面画像を選択してください"),
  isPublished: z.boolean().default(true),
});

type PaperFormValues = z.infer<typeof paperSchema>;

/**
 * 紙面登録フォーム（JPEG方式）
 * PDFを廃止し、画像（Base64）による管理に特化させました。
 */
export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      issueNumber: paper?.issueNumber || 0,
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: paper?.mainImageUrl || "",
      isPublished: paper?.isPublished ?? true,
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if ('files' in (e.target as any) && (e.target as any).files) {
      file = (e.target as any).files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }

    if (!file || !file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "エラー", description: "画像ファイル（JPEG/PNG）を選択してください。" });
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      form.setValue("mainImageUrl", reader.result as string);
      setIsProcessing(false);
      toast({ title: "紙面画像を読み込みました" });
    };
    reader.onerror = () => {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "失敗", description: "画像の読み込みに失敗しました。" });
    };
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    const data = {
      ...values,
      categoryId: "Viewer",
      articleType: "Standard",
      updatedAt: serverTimestamp(),
      updatedBy: user?.email || "unknown"
    };

    if (paper?.id) {
      const docRef = doc(firestore, "articles", paper.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({ title: "更新しました" });
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
      toast({ title: "登録しました" });
    }
    onSuccess();
  };

  const currentImage = form.watch("mainImageUrl");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto pb-10">
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="issueNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">号数</FormLabel>
                <FormControl>
                  <Input type="number" className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                  <Input type="date" className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</FormLabel>
              <FormControl>
                <Input placeholder="例：2025年度 新入生歓迎号" className="h-12 rounded-xl font-bold border-slate-100 bg-slate-50/50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5" /> 紙面画像 (JPEG/PNG)
          </FormLabel>
          <div 
            className={cn(
              "relative aspect-[1/1.414] border-4 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group",
              isDragging ? "border-primary bg-primary/5 scale-[0.98]" : "border-slate-100 bg-slate-50/30 hover:border-primary/30"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e as any); }}
            onClick={() => fileInputRef.current?.click()}
          >
            {currentImage ? (
              <div className="relative w-full h-full">
                <Image src={currentImage} alt="Preview" fill className="object-contain" unoptimized />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-10 w-10 text-white animate-in spin-in duration-500" />
                  <span className="text-white text-xs font-black uppercase tracking-widest">画像を入れ替える</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-white p-6 rounded-full shadow-sm mx-auto w-fit text-slate-300 group-hover:text-primary transition-colors group-hover:scale-110 duration-300">
                  <Upload className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-400">紙面のJPEGファイルをドロップ</p>
                  <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">またはクリックして選択</p>
                </div>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">処理中...</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <Button type="submit" disabled={isProcessing} className="w-full h-16 shadow-2xl font-black rounded-2xl text-xl bg-primary hover:bg-primary/90 transition-all active:scale-95">
            紙面を保存する
          </Button>
        </div>
      </form>
    </Form>
  );
}
