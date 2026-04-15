// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const requiredFirebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseKeys = Object.entries(requiredFirebaseEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseKeys.length === 0;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Missing Firebase env vars: ${missingFirebaseKeys.join(", ")}. Create a .env file in project root and restart dev server.`;

const firebaseConfig = {
  apiKey: requiredFirebaseEnv.apiKey || "missing-api-key",
  authDomain: requiredFirebaseEnv.authDomain || "missing-auth-domain",
  projectId: requiredFirebaseEnv.projectId || "missing-project-id",
  storageBucket: requiredFirebaseEnv.storageBucket || "missing-storage-bucket",
  messagingSenderId: requiredFirebaseEnv.messagingSenderId || "missing-sender-id",
  appId: requiredFirebaseEnv.appId || "missing-app-id",
  measurementId: "G-22LC1C7LTV"
};

if (!isFirebaseConfigured) {
  console.error(`[Firebase] ${firebaseConfigError}`);
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);