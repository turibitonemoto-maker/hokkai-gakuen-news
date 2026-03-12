import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Firebase設定
 * プロジェクト: studio-7293379319-74783
 * ユーザー提供の最新有効なAPIキーを反映
 */
const firebaseConfig = {
  apiKey: "AIzaSyBaV3B9X2Z1W8M0K4L7P2Q1R3S5T6U9",
  authDomain: "studio-7293379319-74783.firebaseapp.com",
  projectId: "studio-7293379319-74783",
  storageBucket: "studio-7293379319-74783.firebasestorage.app",
  messagingSenderId: "1056586024982",
  appId: "1:1056586024982:web:74783a1a1a1a1a1a1a1a1a",
};

// 既に初期化されている場合は既存のアプリを取得、そうでなければ初期化
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { firebaseConfig };
export default app;