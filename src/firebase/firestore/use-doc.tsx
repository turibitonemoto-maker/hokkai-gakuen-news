
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles auth synchronization to prevent early permission errors (flying).
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading || !memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      async (serverError: FirestoreError) => {
        // 【最重要】認証同期ラグ（フライング）対策
        const currentAuthUser = getAuth().currentUser;
        const isAuthLikelyPresent = !!(user || currentAuthUser);
        const isPermissionError = serverError.code === 'permission-denied';

        if (isPermissionError && isAuthLikelyPresent) {
          console.warn(`Firestore (useDoc) [HANDLED]: 認証同期ラグ（フライング）を検知しました。権限の浸透を待機しています... Path: ${memoizedDocRef.path}`);
          setError(serverError);
          setIsLoading(false);
          // ここで return することで、致命的なエラーとしての emit/throw を回避します
          return;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        if (isPermissionError) {
           console.warn(`Firestore (useDoc) [DENIED]: 権限不足または未ログインです。 Path: ${memoizedDocRef.path}`);
           return;
        }

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, user, isUserLoading]);

  return { data, isLoading, error };
}
