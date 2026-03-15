"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Plus, Trash2, FileText, ImageIcon, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";

const paperSchema = z.object({
  issueNumber: z.number().min(1, "号数を入力してください"),
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  mainImageUrl: z.string().optional(),
  pdfUrls: z.array(z.object({
    label: z.string().min(1, "種別を入力（例：本紙）"),
    url: z.string().min(1, "PDFをアップロードしてください")
  })).min(1, "少なくとも1つのPDFが必要です"),
  isPublished: z.boolean().default(true),
});

type PaperFormValues = z.infer<typeof paperSchema>;

interface PaperFormProps {
  paper?: any;
  onSuccess: () => void;
}

/**
 * 紙面登録・編集用フォーム
 * Firebase Storage への直接アップロードと進捗表示をサポートします。
 */
export function PaperForm({ paper, onSuccess }: PaperFormProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, number>>({});
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      issueNumber: paper?.issueNumber || 0,
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      mainImageUrl: paper?.mainImageUrl || "",
      pdfUrls: paper?.pdfUrls || [{ label: "本紙", url: "" }],
      isPublished: paper?.isPublished ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pdfUrls",
  });

  const handleFileUpload = (index: number, file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "エラー", description: "PDFファイルを選択してください。" });
      return;
    }

    const storageRef = ref(storage, `papers/issue-${form.getValues("issueNumber")}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed", 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadingStatus(prev => ({ ...prev, [index]: progress }));
      },
      (error) => {
        toast({ variant: "destructive", title: "アップロード失敗", description: error.message });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue(`pdfUrls.${index}.url`, downloadURL);
          setUploadingStatus(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
          });
          toast({ title: "アップロード完了", description: `${file.name} を保存しました。` });
        });
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      form.setValue("mainImageUrl", reader.result as string);
      setIsProcessingImage(false);
      toast({ title: "表紙画像を読み込みました" });
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
    } else {
      const colRef = collection(firestore, "articles");
      addDocumentNonBlocking(colRef, { ...data, createdAt: serverTimestamp(), viewCount: 0 });
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="issueNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">号数</FormLabel>
                <FormControl>
                  <Input type="number" className="h-12 rounded-xl font-bold" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="publishDate"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">発行日</FormLabel>
                <FormControl>
                  <Input type="date" className="h-12 rounded-xl font-bold" {...field} />
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
              <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">紙面タイトル</FormLabel>
              <FormControl>
                <Input placeholder="例：第100号（本紙）" className="h-12 rounded-xl font-bold" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> 表紙画像（サムネイル）
            </FormLabel>
            <div 
              className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => mainImageInputRef.current?.click()}
            >
              {form.watch("mainImageUrl") ? (
                <Image src={form.watch("mainImageUrl")!} alt="Cover" fill className="object-cover" unoptimized />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-400">画像を選択またはドロップ</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleImageUpload} />
              {isProcessingImage && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
            </div>
          </div>

          <div className="space-y-6">
            <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4" /> PDFファイルの添付
            </FormLabel>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 rounded-2xl border bg-white space-y-3 relative group">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="種別（本紙、別刷など）" 
                      className="h-10 rounded-lg text-sm font-bold w-1/3" 
                      {...form.register(`pdfUrls.${index}.label`)} 
                    />
                    <div className="flex-1 flex gap-2">
                      <Input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        id={`pdf-upload-${index}`}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0])}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-10 rounded-lg flex-1 font-bold text-xs gap-2"
                        onClick={() => document.getElementById(`pdf-upload-${index}`)?.click()}
                      >
                        {form.watch(`pdfUrls.${index}.url`) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Upload className="h-4 w-4" />}
                        {form.watch(`pdfUrls.${index}.url`) ? "アップロード済み" : "PDFを選択"}
                      </Button>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-10 w-10 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {uploadingStatus[index] !== undefined && (
                    <div className="space-y-1">
                      <Progress value={uploadingStatus[index]} className="h-1" />
                      <p className="text-[10px] font-bold text-slate-400 text-right">{Math.round(uploadingStatus[index])}%</p>
                    </div>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" className="w-full h-12 rounded-xl border-2 border-dashed border-slate-100 text-slate-400 font-bold gap-2 hover:bg-slate-50" onClick={() => append({ label: "", url: "" })}>
                <Plus className="h-4 w-4" /> PDFを追加
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-8 border-t">
          <Button type="button" variant="outline" onClick={onSuccess} className="h-12 px-8 rounded-xl font-bold">キャンセル</Button>
          <Button type="submit" className="h-12 px-12 rounded-xl font-black bg-primary shadow-lg shadow-primary/20">紙面を保存する</Button>
        </div>
      </form>
    </Form>
  );
}
