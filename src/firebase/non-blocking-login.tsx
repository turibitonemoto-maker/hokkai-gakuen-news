'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';

/** 匿名サインイン（非同期・非ブロッキング） */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** メールサインアップ（非同期・非ブロッキング） */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch(error => {
    errorEmitter.emit('auth-error', error);
  });
}

/** メールサインイン（非同期・非ブロッキング） */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch(error => {
    errorEmitter.emit('auth-error', error);
  });
}
