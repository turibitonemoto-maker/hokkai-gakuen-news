
'use client';

import { redirect } from 'next/navigation';

export default function ArticlesRedirect() {
  redirect('/admin/articles');
  return null;
}
