
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase SDKを初期化してサービスを返す関数。
 * 接続先プロジェクト（studio-7293379319-74783）との不一致を防ぐため、
 * 既存のアプリがある場合は設定を検証し、必要に応じて再初期化します。
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = getApp();
    // プロジェクトIDが一致しない場合は初期化し直す（キャッシュ対策）
    if (firebaseApp.options.projectId !== firebaseConfig.projectId) {
      console.warn('Firebase project ID mismatch. Re-initializing...');
      // 同期的に処理するため、既存のアプリがあっても initializeApp を強制実行
      firebaseApp = initializeApp(firebaseConfig, `app-${Date.now()}`);
    }
  } else {
    firebaseApp = initializeApp(firebaseConfig);
  }

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
