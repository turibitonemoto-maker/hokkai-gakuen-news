
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
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Plus, GripVertical, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const paperSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  paperImages: z.array(z.string()).min(1, "少なくとも1枚の紙面画像をアップロードしてください"),
});

type PaperFormValues = z.infer<typeof paperSchema>;

function SortableImage({ url, index, onRemove, onPreview }: { url: string; index: number; onRemove: () => void; onPreview: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative aspect-[1/1.4] rounded-2xl overflow-hidden border-2 transition-all group bg-white",
        isDragging ? "opacity-50 scale-95 border-primary" : "border-slate-100 hover:border-primary/50 shadow-sm"
      )}
    >
      <Image src={url} alt={`Page ${index + 1}`} fill className="object-cover" unoptimized />
      
      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
        P.{index + 1}
      </div>

      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-primary hover:text-white transition-colors z-10"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
        <Button 
          type="button" 
          variant="secondary" 
          size="sm" 
          className="h-9 px-6 rounded-full font-black shadow-lg"
          onClick={onPreview}
        >
          表示
        </Button>
        <Button 
          type="button" 
          variant="destructive" 
          size="icon" 
          className="h-9 w-9 rounded-full shadow-lg"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: "",
      publishDate: new Date().toISOString().split("T")[0],
      paperImages: [],
    },
  });

  useEffect(() => {
    if (paper) {
      form.reset({
        title: paper.title || "",
        publishDate: paper.publishDate || new Date().toISOString().split("T")[0],
        paperImages: paper.paperImages || [],
      });
    }
  }, [paper, form]);

  const watchedImages = form.watch("paperImages");
  const currentTitle = form.watch("title");

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  const handleFilesUpload = async (files: FileList) => {
    const titleValue = form.getValues("title");
    if (!titleValue) {
      toast({ variant: "destructive", title: "タイトルを入力してください", description: "フォルダを作成するためにタイトルが必要です。" });
      return;
    }

    const fileArray = Array.from(files);
    setIsUploading(true);
    setUploadProgress({ current: 0, total: fileArray.length });

    const newUrls: string[] = [...watchedImages];
    const subFolder = sanitizeFolderName(titleValue);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file.type.startsWith('image/')) continue;

        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        const formData = new FormData();
        formData.append("file", file);
        // 最高司令官の命令通り、タイトルをフォルダ名として使用
        formData.append("folder", `newspaper_archive/papers/${subFolder}`);
        
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.details || "アップロード失敗");
        }
        const data = await res.json();
        newUrls.push(data.secure_url);
      }

      form.setValue("paperImages", newUrls, { shouldDirty: true });
      toast({ title: `${fileArray.length}枚の画像を追加しました` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "エラー", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = [...watchedImages];
    newUrls.splice(index, 1);
    form.setValue("paperImages", newUrls, { shouldValidate: true, shouldDirty: true });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = watchedImages.indexOf(active.id as string);
      const newIndex = watchedImages.indexOf(over.id as string);
      form.setValue("paperImages", arrayMove(watchedImages, oldIndex, newIndex), { shouldDirty: true });
    }
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    
    const data = {
      ...values,
      mainImageUrl: values.paperImages[0] || "",
      articleType: "Standard",
      categoryId: "Viewer", 
      isPublished: paper?.isPublished ?? true,
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
      toast({ title: "アーカイブを登録しました" });
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 max-w-5xl mx-auto pb-20">
        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <h3 className="font-black text-slate-800">紙面構成管理</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                ドラッグで並び替え / 削除も可能です
              </p>
            </div>
          </div>

          {isUploading && (
            <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl animate-pulse flex items-center gap-4 mb-6">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              <div>
                <p className="text-sm font-black text-primary uppercase">Uploading...</p>
                <p className="text-[10px] font-bold text-slate-400">{uploadProgress.current} / {uploadProgress.total}</p>
              </div>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={watchedImages}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-1">
                {watchedImages.map((url, index) => (
                  <SortableImage 
                    key={url} 
                    url={url} 
                    index={index} 
                    onRemove={() => removeImage(index)}
                    onPreview={() => setPreviewUrl(url)}
                  />
                ))}

                {!isUploading && (
                  <div 
                    className="aspect-[1/1.4] rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="bg-slate-50 p-4 rounded-full text-slate-200 group-hover:scale-110 transition-transform">
                      <Plus className="h-8 w-8" />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-tight text-center">Add<br />Page</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
          
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files && handleFilesUpload(e.target.files)} 
          />
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

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden bg-slate-900 border-none">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-md"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {previewUrl && (
              <Image src={previewUrl} alt="" fill className="object-contain" unoptimized />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
