
'use client';

import Link from 'next/link';
import { Newspaper, Menu, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 w-full",
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-md py-2" : "bg-white py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform">
              <Newspaper className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">北海学園新聞会</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">北海学園大学一部新聞会</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/">ホーム</NavLink>
            <NavLink href="/articles">記事一覧</NavLink>
            <NavLink href="/about">新聞会について</NavLink>
            <NavLink href="/contact">お問い合わせ</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Search className="h-5 w-5" />
            </Button>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2 items-center border-primary/20 hover:bg-primary/5 text-primary font-bold">
                <User className="h-4 w-4" />
                管理者
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-sm font-bold text-slate-600 hover:text-primary transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
    </Link>
  );
}
