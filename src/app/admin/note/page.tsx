'use client';
import { redirect } from 'next/navigation';
export default function NoteRedirectPage() {
  redirect('/admin');
  return null;
}
