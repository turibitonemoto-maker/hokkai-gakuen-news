'use client';

import { redirect } from 'next/navigation';

/**
 * 表示サイトの機能を無効化し、管理画面へ誘導します。
 */
export default function DeactivatedSite() {
  redirect('/admin');
  return null;
}