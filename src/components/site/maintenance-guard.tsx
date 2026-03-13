
'use client';

import { ShieldAlert, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceGuardProps {
  message?: string;
}

export function MaintenanceGuard({ message }: MaintenanceGuardProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-body">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="bg-orange-100 p-6 rounded-full text-orange-600 animate-pulse">
            <ShieldAlert className="h-16 w-16" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            システムメンテナンス中
          </h1>
          <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
        </div>

        <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-2xl border border-slate-100">
          {message || "現在、より良いサービス提供のため定期メンテナンスを行っております。ご不便をおかけしますが、再開までしばらくお待ちください。"}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            className="rounded-full h-12 px-8 font-bold gap-2 shadow-lg"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full h-12 px-8 font-bold gap-2 text-slate-500 border-slate-200"
            asChild
          >
            <a href="mailto:support@example.com">
              <Mail className="h-4 w-4" />
              お問い合わせ
            </a>
          </Button>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          北海学園新聞会 管制システム
        </p>
      </div>
    </div>
  );
}
