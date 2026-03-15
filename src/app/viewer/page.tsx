
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 紙面ビューアー（公開用）を廃止し、管理画面へ誘導します。
 */
export default function ViewerListPage() {
  useEffect(() => {
    redirect('/admin/viewer');
  }, []);

  return null;
}
