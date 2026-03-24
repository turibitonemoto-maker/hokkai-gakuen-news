
"use client";

import Link from 'next/link';
import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "ホーム" },
    { href: "/articles", label: "記事一覧" },
    { href: "/viewer", label: "紙面ビューアー" },
    { href: "/about", label: "新聞会について" },
  ];

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
            <div className="bg-white p-1 rounded-xl shadow-md border group-hover:scale-105 transition-transform">
              <Image 
                src="/icon.png" 
                alt="北海学園大学新聞" 
                width={32} 
                height={32} 
                className="rounded-lg"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">北海学園大学新聞</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">独立管制センター</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2 items-center border-primary/20 hover:bg-primary/5 text-primary font-bold">
                <User className="h-4 w-4" />
                管理者
              </Button>
            </Link>
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-slate-100">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 border-none bg-white">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="flex items-center gap-3">
                    <Image src="/icon.png" alt="" width={24} height={24} />
                    北海学園大学新聞
                  </SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-4">
                  {navLinks.map((link) => (
                    <Link 
                      key={link.href} 
                      href={link.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-lg font-black text-slate-700 hover:text-primary transition-colors py-2 border-b border-slate-50"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full mt-6 h-12 font-black rounded-xl gap-2">
                      <User className="h-4 w-4" />
                      管理者入口
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
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
