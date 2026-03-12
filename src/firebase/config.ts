import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "studio-2834998972-a3eb3.firebaseapp.com",
  projectId: "studio-2834998972-a3eb3",
  storageBucket: "studio-2834998972-a3eb3.appspot.com",
  messagingSenderId: "367150149023",
  appId: "1:367150149023:web:7362a26563604928157774"
};

// アプリの初期化（重複を防ぐ）
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 各サービスの書き出し
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analyticsはブラウザ環境のみで初期化
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;