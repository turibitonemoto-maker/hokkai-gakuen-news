
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, orderBy, query, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Mail, User, Clock, MessageSquare, AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InquiryManager() {
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<any>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const inquiriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "inquiries"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: inquiries, isLoading } = useCollection(inquiriesQuery);

  const handleView = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    if (!inquiry.isRead && firestore) {
      const docRef = doc(firestore, "inquiries", inquiry.id);
      updateDocumentNonBlocking(docRef, { isRead: true });
    }
  };

  const confirmDelete = () => {
    if (!inquiryToDelete || !firestore) return;
    
    const docRef = doc(firestore, "inquiries", inquiryToDelete.id);
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "メッセージを削除しました",
      description: `${inquiryToDelete.name}様からのメッセージを削除しました。`,
    });
    
    setInquiryToDelete(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">お問い合わせ管理</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white">
            全 {inquiries?.length || 0} 件
          </Badge>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
            未読 {inquiries?.filter(i => !i.isRead).length || 0} 件
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">状態</TableHead>
                  <TableHead>送信者</TableHead>
                  <TableHead>件名</TableHead>
                  <TableHead>送信日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries?.map((inquiry) => (
                  <TableRow key={inquiry.id} className={inquiry.isRead ? "opacity-70" : "font-bold bg-primary/5"}>
                    <TableCell>
                      {!inquiry.isRead ? (
                        <Badge className="bg-primary hover:bg-primary">未読</Badge>
                      ) : (
                        <Badge variant="outline">既読</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{inquiry.name}</span>
                        <span className="text-xs text-slate-500">{inquiry.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inquiry.subject || "(件名なし)"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(inquiry.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleView(inquiry)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10" 
                          onClick={() => setInquiryToDelete(inquiry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inquiries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                      メッセージはまだ届いていません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 詳細表示ダイアログ */}
      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              お問い合わせ詳細
            </DialogTitle>
            <DialogDescription>
              送信日時: {formatDate(selectedInquiry?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> 送信者
                </span>
                <p className="text-sm font-medium">{selectedInquiry?.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> メールアドレス
                </span>
                <p className="text-sm font-medium text-primary underline">{selectedInquiry?.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> 件名
              </span>
              <p className="text-sm font-bold bg-slate-50 p-2 rounded border">
                {selectedInquiry?.subject || "(件名なし)"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> 本文
              </span>
              <div className="bg-slate-50 p-4 rounded border text-sm leading-relaxed whitespace-pre-wrap min-h-[150px]">
                {selectedInquiry?.message}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>閉じる</Button>
            <Button asChild>
              <a href={`mailto:${selectedInquiry?.email}?subject=Re: ${selectedInquiry?.subject}`}>
                返信する
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!inquiryToDelete} onOpenChange={(open) => !open && setInquiryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>メッセージを削除しますか？</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <span className="font-bold text-slate-900">{inquiryToDelete?.name}</span>様からのメッセージを削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
