'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase App および各サービス（Auth, Firestore）の初期化。
 * クライアントサイドでの二重初期化を防止し、常に有効なSDKインスタンスを返します。
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // 自動初期化（Firebase Consoleでの設定に基づく）を試行
      firebaseApp = initializeApp();
    } catch (e) {
      // 失敗した場合は config.ts の定義を使用
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

/**
 * Firebase App インスタンスから各サービスを取得。
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// エクスポートの衝突を避けるための明確なバレル構成
// useUser は ./auth/use-user からのみエクスポートされます
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
