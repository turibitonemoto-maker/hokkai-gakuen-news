
'use client';

import { redirect } from 'next/navigation';

/**
 * 管制システム・エントリーポイント
 * 本システムは管理専用のため、ルートアクセスを管理画面へ誘導します。
 */
export default function RootPage() {
  redirect('/admin');
  return null;
}
