
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * ルートパスへのアクセスを管理画面へ強制誘導します。
 * 本システムは管理専用インフラとして機能します。
 */
export default function RootPage() {
  useEffect(() => {
    redirect('/admin');
  }, []);

  return null;
}
