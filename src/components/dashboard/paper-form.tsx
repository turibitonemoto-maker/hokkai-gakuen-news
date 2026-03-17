
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
import { Loader2, Upload, Trash2, Layers, RefreshCw, Plus, GripVertical, Eye, X } from "lucide-react";
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
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const paperSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  publishDate: z.string().min(1, "発行日を選択してください"),
  paperImages: z.array(z.string()).min(1, "少なくとも1枚の紙面画像をアップロードしてください"),
});

type PaperFormValues = z.infer<typeof paperSchema>;

// 並び替え可能なアイテムコンポーネント
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
      
      {/* ページ番号バッジ */}
      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
        P.{index + 1}
      </div>

      {/* ドラッグハンドル */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-primary hover:text-white transition-colors z-10"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* ホバー時操作パネル */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
        <Button 
          type="button" 
          variant="secondary" 
          size="sm" 
          className="h-9 px-4 rounded-full font-black gap-2 shadow-lg"
          onClick={onPreview}
        >
          <Eye className="h-4 w-4" />
          内容を確認
        </Button>
        <Button 
          type="button" 
          variant="destructive" 
          size="icon" 
          className="h-9 w-9 rounded-full shadow-lg"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
      paperImages: paper?.paperImages || [],
    },
  });

  const watchedImages = form.watch("paperImages");

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
      toast({ title: `${fileArray.length}枚の画像を取り込みました` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "エラー", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = [...watchedImages];
    newUrls.splice(index, 1);
    form.setValue("paperImages", newUrls);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = watchedImages.indexOf(active.id as string);
      const newIndex = watchedImages.indexOf(over.id as string);
      form.setValue("paperImages", arrayMove(watchedImages, oldIndex, newIndex));
    }
  };

  const onSubmit = (values: PaperFormValues) => {
    if (!firestore) return;
    
    // 並び替えた配列の最初の画像をメイン画像（表紙）として採用
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
            <div className="space-y-1">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                紙面構成管理
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                ドラッグで並び替え / 画像をクリックで内容を確認
              </p>
            </div>
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={watchedImages} 
              strategy={rectSortingStrategy}
            >
              {watchedImages.length > 0 ? (
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
            </SortableContext>
          </DndContext>
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

      {/* 拡大プレビュー（検閲）ダイアログ */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden bg-slate-900 border-none">
          <DialogHeader className="absolute top-4 left-4 z-50">
            <DialogTitle className="text-white font-black bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              紙面検閲モード
            </DialogTitle>
          </DialogHeader>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {previewUrl && (
              <Image 
                src={previewUrl} 
                alt="Full Preview" 
                fill 
                className="object-contain" 
                unoptimized 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
