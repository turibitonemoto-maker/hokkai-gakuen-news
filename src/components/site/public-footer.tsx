"use client";

import Link from 'next/link';
import { Twitter, Instagram, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1e293b] text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl shadow-md border">
                <Image src="/favicon.ico" alt="北海学園新聞会" width={32} height={32} className="rounded-lg" />
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">北海学園新聞会</h1>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              北海学園大学一部新聞会は、学内のニュースや学生生活に密着した情報を発信する公認サークルです。
            </p>
            <div className="flex gap-4">
              <a href="https://twitter.com/hokkai_shinbun" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-all">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://instagram.com/hokkai_shinbun" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="mailto:admin@example.com" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-all">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-sm flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              コンテンツ
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/" className="hover:text-primary transition-colors">ホーム</Link></li>
              <li><Link href="/articles" className="hover:text-primary transition-colors">記事一覧</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">新聞会について</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-sm flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              リンク
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link href="/admin" className="hover:text-primary transition-colors">管理者入口</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-sm flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              アクセス
            </h4>
            <div className="space-y-4 text-sm text-slate-400 font-medium">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <p>〒062-8605<br />札幌市豊平区旭町4丁目1-40<br />北海学園大学内</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
          <p>© {currentYear} 北海学園新聞会. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
