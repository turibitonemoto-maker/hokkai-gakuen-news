import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Firebase configuration
 * apiKeyはVercelの環境変数から読み込むことで、GitHub公開による凍結を防ぎます。
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
  authDomain: "studio-7293379319-74783.firebaseapp.com",
  projectId: "studio-7293379319-74783",
  storageBucket: "studio-7293379319-74783.firebasestorage.app",
  messagingSenderId: "820160445583",
  appId: "1:820160445583:web:b9289238a9c9df7a9404fa",
  measurementId: "G-G6FVKPHH6Q"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 他のファイルで使用する機能をエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;