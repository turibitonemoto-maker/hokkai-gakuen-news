import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

/**
 * Firebase configuration
 * プロジェクト: studio-7293379319-74783
 */
export const firebaseConfig = {
  apiKey: "AIzaSyD-7293379319-74783-KEY", // Firebase Studio側で自動的に有効なキーに置換されます
  authDomain: "studio-7293379319-74783.firebaseapp.com",
  projectId: "studio-7293379319-74783",
  storageBucket: "studio-7293379319-74783.firebasestorage.app",
  messagingSenderId: "820160445583",
  appId: "1:820160445583:web:b9289238a9c9df7a9404fa",
  measurementId: "G-G6FVKPHH6Q"
};

// 重複初期化を防ぎつつアプリを取得
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
