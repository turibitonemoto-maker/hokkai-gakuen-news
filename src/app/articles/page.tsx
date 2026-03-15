
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 記事一覧（公開用）を廃止し、管理画面へ誘導します。
 */
export default function ArticlesPage() {
  useEffect(() => {
    redirect('/admin/articles');
  }, []);

  return null;
}
