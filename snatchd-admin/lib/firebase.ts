import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC5kxZPFm_t5gj8wcBKf9JBFtO-fQCbIfU",
  authDomain: "snatchd-app26.firebaseapp.com",
  projectId: "snatchd-app26",
  storageBucket: "snatchd-app26.firebasestorage.app",
  messagingSenderId: "101338897258",
  // appId: "YOUR_WEB_APP_ID" // Optional for now, required for Analytics
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
