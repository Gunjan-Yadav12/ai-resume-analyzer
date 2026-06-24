// app/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// All values come from your .env file via Vite's import.meta.env
// If any value is undefined, you'll get a Firebase init error immediately
// which is better than a silent failure deep in the app
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// THE MOST IMPORTANT LINE IN THIS FILE:
// getApps() returns an array of all currently initialized Firebase apps.
// If it's empty (length === 0), no app exists yet so we call initializeApp().
// If it's not empty, an app already exists so we call getApp() to reuse it.
//
// WHY THIS MATTERS:
// React Router (and React in general with Strict Mode + HMR) can re-run
// module-level code multiple times during development. If you just call
// initializeApp() unconditionally, the second call throws:
// "Firebase: Error (app/duplicate-app)"
// This pattern is the standard Firebase guard against that error.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// auth — handles sign in, sign out, and current user state
// We export the GoogleAuthProvider CLASS (not an instance) because
// you create a new provider instance each time you trigger a sign-in
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// db — Firestore database instance
// This replaces puter.kv — all resume data goes here
export const db = getFirestore(app);

// storage — Firebase Storage instance
// This replaces puter.fs — PDF and image files go here
export const storage = getStorage(app);