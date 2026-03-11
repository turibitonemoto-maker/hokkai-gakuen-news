'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, deleteApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Initializes Firebase services.
 * キャッシュや以前の状態に左右されないよう、明示的な設定で再初期化を強制します。
 */
export function initializeFirebase() {
  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    const currentApp = existingApps[0];
    // プロジェクトIDが一致しない場合は既存のアプリを削除して再作成
    if (currentApp.options.projectId !== firebaseConfig.projectId) {
      for (const app of existingApps) {
        deleteApp(app).catch(err => console.warn('Failed to delete existing app:', err));
      }
    } else {
      return {
        firebaseApp: currentApp,
        auth: getAuth(currentApp),
        firestore: getFirestore(currentApp)
      };
    }
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
