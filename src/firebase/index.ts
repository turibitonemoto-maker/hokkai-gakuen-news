'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase SDKを初期化してサービスを返す関数
 * キャッシュや以前の状態に左右されないよう、明示的な設定で初期化を強制します。
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      // 指定された設定（projectId: studio-7293379319-74783）で確実に初期化
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization error:', e);
      firebaseApp = getApp();
    }
  } else {
    firebaseApp = getApp();
  }

  // Firestoreの初期化。databaseIdは(default)が使用されます。
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