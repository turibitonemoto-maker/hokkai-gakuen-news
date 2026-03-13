
'use client';

import { redirect } from 'next/navigation';

/**
 * 公開サイト機能を無効化し、管理画面へリダイレクトします。
 * このアプリは純粋なCMS（管理システム）として機能します。
 */
export default function RootPage() {
  redirect('/admin');
  return null;
}
