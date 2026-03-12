const firebaseConfig = {
  apiKey: "AIzaSyBv_y1-D2-q5-u2-V3-S4-T5-U6-V7-W8",
  authDomain: "studio-7293379319-74783.firebaseapp.com",
  projectId: "studio-7293379319-74783",
  storageBucket: "studio-7293379319-74783.appspot.com",
  messagingSenderId: "7293379319",
  appId: "1:7293379319:web:96898d9e288e2c38865f37"
};

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };