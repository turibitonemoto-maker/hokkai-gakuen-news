
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
import { Loader2, Plus, GripVertical, X } from "lucide-react";
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
});

type PaperFormValues = z.infer<typeof paperSchema>;

interface PageData {
  id: string;
  url: string;
  file?: File;
}

function SortableImage({ page, index, onRemove, onPreview }: { page: PageData; index: number; onRemove: () => void; onPreview: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: page.id });

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
      <Image src={page.url} alt={`Page ${index + 1}`} fill className="object-cover" unoptimized />
      
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
  const [isSaving, setIsSaving] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
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
    },
  });

  useEffect(() => {
    if (paper) {
      form.reset({
        title: paper.title || "",
        publishDate: paper.publishDate || new Date().toISOString().split("T")[0],
      });
      const existingPages = (paper.paperImages || []).map((url: string) => ({
        id: url,
        url: url
      }));
      setPages(existingPages);
    }
  }, [paper, form]);

  const handleFilesSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const newPages: PageData[] = fileArray.map(file => {
      const tempUrl = URL.createObjectURL(file);
      return {
        id: tempUrl,
        url: tempUrl,
        file: file
      };
    });
    setPages(prev => [...prev, ...newPages]);
  };

  const removePage = (index: number) => {
    const target = pages[index];
    if (target.file) {
      URL.revokeObjectURL(target.url);
    }
    const newPages = [...pages];
    newPages.splice(index, 1);
    setPages(newPages);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p.id === active.id);
      const newIndex = pages.findIndex(p => p.id === over.id);
      setPages(arrayMove(pages, oldIndex, newIndex));
    }
  };

  const sanitizeFolderName = (name: string) => {
    return name.trim().replace(/[\/\?\s]/g, '_').slice(0, 50) || "untitled";
  };

  const onSubmit = async (values: PaperFormValues) => {
    if (!firestore || pages.length === 0) {
      if (pages.length === 0) toast({ variant: "destructive", title: "画像がありません" });
      return;
    }
    
    setIsSaving(true);
    const subFolder = sanitizeFolderName(values.title);
    const finalUrls: string[] = [];

    try {
      for (const page of pages) {
        if (page.file) {
          const formData = new FormData();
          formData.append("file", page.file);
          formData.append("folder", `newspaper_archive/${subFolder}`);
          
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("アップロード中にエラーが発生しました");
          const data = await res.json();
          finalUrls.push(data.secure_url);
        } else {
          finalUrls.push(page.url);
        }
      }

      const data = {
        ...values,
        paperImages: finalUrls,
        mainImageUrl: finalUrls[0] || "",
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
        toast({ title: "アーカイブを登録しました" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "失敗", description: error.message });
    } finally {
      setIsSaving(false);
    }
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
                ドラッグで並び替え / 削除が可能です
              </p>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-1">
                {pages.map((page, index) => (
                  <SortableImage 
                    key={page.id} 
                    page={page} 
                    index={index} 
                    onRemove={() => removePage(index)}
                    onPreview={() => setPreviewUrl(page.url)}
                  />
                ))}

                <div 
                  className="aspect-[1/1.4] rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-slate-50 p-4 rounded-full text-slate-200 group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8" />
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-tight text-center">Add<br />Page</p>
                </div>
              </div>
            </SortableContext>
          </DndContext>
          
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files && handleFilesSelect(e.target.files)} 
          />
        </div>

        <div className="pt-10 border-t sticky bottom-6 z-20">
          <Button 
            type="submit" 
            disabled={pages.length === 0 || isSaving}
            className="w-full h-16 shadow-2xl font-black rounded-2xl text-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> 保存中...</>
            ) : (
              "紙面アーカイブを保存する"
            )}
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
