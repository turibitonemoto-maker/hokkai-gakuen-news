
'use client';

import { redirect } from 'next/navigation';

/**
 * 公開サイトは無効化されました。管理画面へ強制誘導します。
 */
export default function AboutPage() {
  redirect('/admin');
  return null;
}
