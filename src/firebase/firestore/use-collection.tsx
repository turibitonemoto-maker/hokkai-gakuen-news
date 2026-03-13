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
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [retryCount, setRetryCount] = useState(0); 
  
  const { user, isUserLoading } = useUser();

  useEffect(() => {
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
        setRetryCount(0);
      },
      async (serverError: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        const errorCode = serverError.code?.toLowerCase();
        const errorMessage = serverError.message?.toLowerCase() || '';
        
        const isPermissionError = 
          errorCode === 'permission-denied' || 
          errorCode === 'unauthenticated' ||
          errorMessage.includes('permission') ||
          errorMessage.includes('insufficient') ||
          errorMessage.includes('denied');

        // 認証同期ラグ（フライング）対策: 
        // ログイン済みであれば、エラーを投げずに1秒後に自動再試行する
        if (isPermissionError && user && retryCount < 5) {
          console.warn(`Firestore (useCollection) [WAITING]: 権限同期を待機中... Path: ${path}`);
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
          return;
        }

        // インデックスエラーの場合の警告
        if (errorCode === 'failed-precondition') {
          console.error(`Firestore (useCollection) [INDEX_REQUIRED]: 複合インデックスが必要です。コンソールのリンクから作成してください。\nPath: ${path}\nError: ${serverError.message}`);
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        // 重要: データ取得系のエラーはローカルな状態として保持し、
        // errorEmitter.emit によるグローバルな例外送出（アプリのクラッシュ）は避ける。
        setError(contextualError);
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, user, isUserLoading, retryCount]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' は useMemoFirebase でメモ化されていません');
  }
  return { data, isLoading, error };
}