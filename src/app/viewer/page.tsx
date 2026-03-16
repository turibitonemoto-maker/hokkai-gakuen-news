
'use client';

import { redirect } from 'next/navigation';

/**
 * 公開ページは無効化されました。
 */
export default function ViewerListPage() {
  redirect('/admin');
  return null;
}
