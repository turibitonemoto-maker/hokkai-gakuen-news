import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

/**
 * Firebase configuration
 * プロジェクト: studio-7293379319-74783
 */
export // src/lib/firebase/config.ts

const firebaseConfig = {
  // ここを「直接の鍵」から「呼び出し用の名前」に変えるのがプロの技！
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "your-project-id.firebaseapp.com", // プロジェクトIDに合わせて変更
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// ...以下、初期化コードなど

// 重複初期化を防ぎつつアプリを取得
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
