
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

function SortableImage({ page, index, onRemove }: { page: PageData; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative aspect-[1/1.4] rounded-xl overflow-hidden border bg-white group">
      <Image src={page.url} alt="" fill className="object-cover" unoptimized />
      <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 rounded-full">P.{index + 1}</div>
      <div {...attributes} {...listeners} className="absolute top-1 right-1 p-1 bg-white/80 rounded cursor-grab"><GripVertical className="h-3 w-3" /></div>
      <Button type="button" variant="destructive" size="icon" className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onRemove}><X className="h-3 w-3" /></Button>
    </div>
  );
}

export function PaperForm({ paper, onSuccess }: { paper?: any; onSuccess: () => void }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      title: paper?.title || "",
      publishDate: paper?.publishDate || new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (paper?.paperImages) {
      setPages(paper.paperImages.map((url: string) => ({ id: url, url })));
    }
  }, [paper]);

  const handleFilesSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const overSized = fileArray.filter(f => f.size > MAX_FILE_SIZE);
    if (overSized.length > 0) {
      toast({ variant: "destructive", title: "写真のデータが大きすぎます", description: "圧縮してください。" });
      return;
    }
    const newPages = fileArray.map(file => ({ id: URL.createObjectURL(file), url: URL.createObjectURL(file), file }));
    setPages(prev => [...prev, ...newPages]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p.id === active.id);
      const newIndex = pages.findIndex(p => p.id === over.id);
      setPages(arrayMove(pages, oldIndex, newIndex));
    }
  };

  const onSubmit = async (values: PaperFormValues) => {
    if (!firestore || pages.length === 0) return;
    setIsSaving(true);
    try {
      const finalUrls: string[] = [];
      for (const page of pages) {
        if (page.file) {
          const formData = new FormData();
          formData.append("file", page.file);
          formData.append("folder", "papers");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          finalUrls.push(data.secure_url);
        } else {
          finalUrls.push(page.url);
        }
      }
      const data = { ...values, paperImages: finalUrls, categoryId: "Viewer", isPublished: true, updatedAt: serverTimestamp() };
      if (paper?.id) setDocumentNonBlocking(doc(firestore, "articles", paper.id), data, { merge: true });
      else addDocumentNonBlocking(collection(firestore, "articles"), { ...data, createdAt: serverTimestamp() });
      toast({ title: "保存しました" });
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "失敗" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 font-body">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">タイトル</FormLabel><FormControl><Input className="h-12 rounded-xl" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="publishDate" render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">発行日</FormLabel><FormControl><Input type="date" className="h-12 rounded-xl" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map(p => p.id)}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {pages.map((p, i) => <SortableImage key={p.id} page={p} index={i} onRemove={() => setPages(pages.filter((_, idx) => idx !== i))} />)}
              <div className="aspect-[1/1.4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
                <Plus className="h-6 w-6 text-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 mt-1">追加</span>
              </div>
            </div>
          </SortableContext>
        </DndContext>
        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={e => e.target.files && handleFilesSelect(e.target.files)} />
        <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl font-black">{isSaving ? "保存中..." : "保存する"}</Button>
      </form>
    </Form>
  );
}
