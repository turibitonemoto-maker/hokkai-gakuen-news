
'use client';

import { redirect } from 'next/navigation';

export default function ArticleDetailRedirect() {
  redirect('/admin/articles');
  return null;
}
