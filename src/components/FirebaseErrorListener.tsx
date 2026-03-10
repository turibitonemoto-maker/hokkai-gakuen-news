'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Firestoreの権限エラーを監視し、開発時に分かりやすいエラー画面を表示するコンポーネント。
 * 認証エラー（ログイン失敗など）はアプリをクラッシュさせないよう、ここでは無視します。
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // セキュリティルール違反は開発者に知らせるためスローする
      setError(error);
    };

    const handleAuthError = (error: Error) => {
      // ログイン失敗などの認証エラーは、各コンポーネント（LoginFormなど）で処理するため
      // ここではスロー（クラッシュ）させません。
      console.warn("Auth Error handled contextually:", error.message);
    };

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('auth-error', handleAuthError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('auth-error', handleAuthError);
    };
  }, []);

  if (error) {
    throw error;
  }

  return null;
}
