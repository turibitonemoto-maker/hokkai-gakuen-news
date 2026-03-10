'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch(error => {
    errorEmitter.emit('auth-error', error);
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch(error => {
    errorEmitter.emit('auth-error', error);
  });
}

/** Initiate email/password sign-in (non-blocking with session persistence). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // Set persistence to session before signing in
  setPersistence(authInstance, browserSessionPersistence)
    .then(() => {
      return signInWithEmailAndPassword(authInstance, email, password);
    })
    .catch(error => {
      errorEmitter.emit('auth-error', error);
    });
}
