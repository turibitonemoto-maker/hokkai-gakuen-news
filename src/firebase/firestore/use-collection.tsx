
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles auth synchronization to prevent early permission errors (flying).
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // 1. 認証チェック中、またはターゲットがない場合は待機
    if (isUserLoading || !memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      async (serverError: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        // 【最重要】認証同期ラグ（フライング）対策
        // ログイン済み（またはログイン中）であるにもかかわらず権限エラーが出た場合は、
        // サーバー側での認証情報の浸透待ちと判断し、RSOD（赤画面）を出さずに警告にとどめる
        const currentAuthUser = getAuth().currentUser;
        const isAuthLikelyPresent = !!(user || currentAuthUser);
        const isPermissionError = serverError.code === 'permission-denied' || serverError.message.toLowerCase().includes('permission');
        
        if (isPermissionError && isAuthLikelyPresent) {
          console.warn(`Firestore (useCollection): 認証同期ラグ（フライング）を検知しました。権限の浸透を待機しています... Path: ${path}`);
          setIsLoading(false);
          // ここで return することで、致命的なエラーとしての emit/throw を回避します
          return;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        // 致命的な権限エラー（未ログインなのにアクセス等）の場合のみ、グローバル通知を行ってアプリを停止させる
        setError(contextualError)
        setData(null)
        setIsLoading(false)
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, user, isUserLoading]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' は useMemoFirebase でメモ化されていません');
  }
  return { data, isLoading, error };
}
