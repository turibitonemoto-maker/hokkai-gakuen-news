
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";

const adSchema = z.object({
  title: z.string().min(1, "広告名を入力してください"),
  imageUrl: z.string().min(1, "画像データが必要です"),
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
      linkUrl: ad?.linkUrl || "",
      startDate: ad?.startDate || new Date().toISOString().slice(0, 16),
      endDate: ad?.endDate || "",
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      form.setValue("imageUrl", reader.result as string);
      toast({ title: "バナーを読み込みました（Base64）" });
      setIsProcessing(false);
    };
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">バナー画像 (Base64)</FormLabel>
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
          <Button type="submit" className="rounded-xl h-12 px-10 font-black bg-primary">保存する</Button>
        </div>
      </form>
    </Form>
  );
}
