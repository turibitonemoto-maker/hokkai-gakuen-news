
'use client';
import {
  Auth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';

/** 
 * メールアドレスとパスワードによるログイン。
 * 永続性設定などの複雑な処理を排除し、標準的な方法でログインを試みます。
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch(error => {
      console.error("Firebase Auth Error:", error.code, error.message);
      // エラーをエミッターを通じてUIに伝える
      errorEmitter.emit('auth-error', error);
    });
}
