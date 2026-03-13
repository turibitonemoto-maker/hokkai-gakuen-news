'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
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
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
        setRetryCount(0);
      },
      async (serverError: FirestoreError) => {
        const errorCode = serverError.code?.toLowerCase();
        const errorMessage = serverError.message?.toLowerCase() || '';
        
        const isPermissionError = 
          errorCode === 'permission-denied' || 
          errorCode === 'unauthenticated' ||
          errorMessage.includes('permission') ||
          errorMessage.includes('insufficient') ||
          errorMessage.includes('denied');

        // 認証同期ラグ対策
        if (isPermissionError && user && retryCount < 5) {
          console.warn(`Firestore (useDoc) [WAITING]: 権限同期を待機中... Path: ${memoizedDocRef.path}`);
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
          return;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, user, isUserLoading, retryCount]);

  return { data, isLoading, error };
}