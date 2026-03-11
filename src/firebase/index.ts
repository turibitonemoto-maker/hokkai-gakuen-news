'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase SDKを初期化してサービスを返す関数。
 * キャッシュや古い接続情報を完全にクリアするため、既存のアプリを一度削除してから
 * 正しいプロジェクトID (studio-7293379319-74783) で再初期化します。
 */
export function initializeFirebase() {
  const existingApps = getApps();
  
  // 既存のアプリをすべて削除して、強制的に最新の設定でリロードする
  for (const app of existingApps) {
    deleteApp(app).catch(err => console.warn('Failed to delete existing app:', err));
  }

  const firebaseApp = initializeApp(firebaseConfig);
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';