"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useFirebase } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";

const adSchema = z.object({
  title: z.string().min(1, "広告名を入力してください"),
  imageUrl: z.string().url("有効な画像URLを入力してください"),
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { firebaseApp } = useFirebase();
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
    if (!file || !firebaseApp) return;

    setIsUploading(true);
    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `ads/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      form.setValue("imageUrl", url);
      toast({ title: "バナーをアップロードしました" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
    } finally {
      setIsUploading(false);
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
      toast({ title: "追加完了" });
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>広告名</FormLabel>
              <FormControl>
                <Input placeholder="例：学内生協 特別キャンペーン" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>バナー画像</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="URLが自動設定されます" {...field} />
                </FormControl>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="gap-2 font-bold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  アップロード
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>遷移先URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>表示開始日時</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>表示終了日時</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">キャンセル</Button>
          <Button type="submit" className="rounded-xl font-black">{ad ? "保存" : "登録"}</Button>
        </div>
      </form>
    </Form>
  );
}
