
'use client';

import { redirect } from 'next/navigation';

/**
 * お問い合わせ管理は廃止されました（外部SNSへ移行）。
 * アクセスされた場合はダッシュボードへリダイレクトします。
 */
export default function InquiriesAdminPage() {
  redirect('/admin');
  return null;
}
