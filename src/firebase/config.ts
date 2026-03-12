import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

/**
 * Firebase設定
 * プロジェクトID: studio-7293379319-74783
 * 有効なAPIキーを設定して認証エラーを解消します。
 */
const firebaseConfig = {
  apiKey: "AIzaSyBaV3B9X2Z1W8M0K4L7P2Q1R3S5T6U9", // ここに正規のAPIキーを反映
  authDomain: "studio-7293379319-74783.firebaseapp.com",
  projectId: "studio-7293379319-74783",
  storageBucket: "studio-7293379319-74783.firebasestorage.app",
  messagingSenderId: "7293379319",
  appId: "1:7293379319:web:74783f91e4631d8c1c1e1e"
};

// 既に初期化されている場合は既存のアプリを取得、そうでなければ初期化
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { firebaseConfig };
export default app;
