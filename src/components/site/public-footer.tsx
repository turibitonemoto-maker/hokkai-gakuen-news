
'use client';

import Link from 'next/link';
import { Newspaper, Twitter, Instagram, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1e293b] text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* ロゴ・紹介 */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl text-white">
                <Newspaper className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">Hokkai Gakuen News 1</h1>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              北海学園大学一部新聞会は、学内のニュースや学生生活に密着した情報を発信する公認サークルです。真実を伝え、学生同士の繋がりを深めることを使命としています。
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={Twitter} />
              <SocialIcon icon={Instagram} />
              <SocialIcon icon={Mail} />
            </div>
          </div>

          {/* クイックリンク */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              コンテンツ
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <FooterLink href="/">ホーム</FooterLink>
              <FooterLink href="/articles">最新ニュース</FooterLink>
              <FooterLink href="/articles?cat=Campus">学内行事</FooterLink>
              <FooterLink href="/articles?cat=Sports">体育会情報</FooterLink>
              <FooterLink href="/note">note連動記事</FooterLink>
            </ul>
          </div>

          {/* 新聞会について */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              活動紹介
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <FooterLink href="/about">組織概要</FooterLink>
              <FooterLink href="/about#history">沿革</FooterLink>
              <FooterLink href="/about#join">入会案内</FooterLink>
              <FooterLink href="/contact">プレスリリース送付</FooterLink>
              <FooterLink href="/contact#ad">広告掲載について</FooterLink>
            </ul>
          </div>

          {/* アクセス情報 */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              お問い合わせ
            </h4>
            <div className="space-y-4 text-sm text-slate-400 font-medium">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <p>〒062-8605<br />北海道札幌市豊平区旭町4丁目1-40<br />北海学園大学 豊平キャンパス内</p>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <p>011-xxx-xxxx</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
          <p>© {currentYear} Hokkai Gakuen News 1 (HGU 1st Newspaper Club). All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-primary transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">利用規約</Link>
            <Link href="/admin" className="hover:text-white transition-colors">管理者入口</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon }: { icon: any }) {
  return (
    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-primary transition-colors inline-block">
        {children}
      </Link>
    </li>
  );
}
