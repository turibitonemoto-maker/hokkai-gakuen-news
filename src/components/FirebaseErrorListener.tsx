'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      setError(error);
    };

    const handleAuthError = (error: Error) => {
      // Auth errors are often user-level (invalid credentials), 
      // so we might not want to crash the whole app in production.
      // But for the developer loop, we propagate it.
      setError(error);
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
