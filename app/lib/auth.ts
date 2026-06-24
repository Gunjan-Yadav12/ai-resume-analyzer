// app/lib/auth.ts
// Replaces puter.auth.signIn(), puter.auth.signOut(), puter.auth.isSignedIn()
// and the entire auth section of puter.ts

import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth, googleProvider } from '~/lib/firebase';

// ─────────────────────────────────────────────────────────────
// UNDERSTANDING FIREBASE AUTH STATE
// ─────────────────────────────────────────────────────────────
//
// Firebase Auth is PERSISTENT by default. When a user signs in,
// Firebase stores the auth token in IndexedDB (not localStorage —
// IndexedDB survives private browsing sessions better and has
// more storage space).
//
// This means:
//   - User signs in → closes browser → reopens browser
//   - Firebase automatically restores the session
//   - onAuthStateChanged fires with the user object immediately
//   - No redirect to login page
//
// The auth state machine has exactly 3 states:
//   1. LOADING  — Firebase is checking IndexedDB for existing session
//                 (happens on every page load, takes ~100-300ms)
//   2. SIGNED IN  — User object exists, token is valid
//   3. SIGNED OUT — No user, or token expired
//
// You MUST handle the LOADING state in your UI or you'll get a
// flash where the app thinks the user is signed out for 300ms
// before Firebase restores the session. This causes a redirect
// to the auth page and then immediately back — very bad UX.
// ─────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<User> {
    // signInWithPopup() opens a Google OAuth popup window
    // The user picks their Google account in the popup
    // Firebase handles the OAuth token exchange behind the scenes
    // When the popup closes, this promise resolves with the result
    //
    // WHY POPUP vs REDIRECT?
    // signInWithRedirect() is the alternative — it navigates away from
    // your app entirely to Google's login page, then redirects back.
    // Popup is better for SPAs (Single Page Apps) because:
    //   - Your app state is preserved (no full page reload)
    //   - Faster — no full navigation cycle
    //   - Simpler — no need to handle the redirect result on page load
    // Popup has one downside: blocked by popup blockers if not triggered
    // directly by a user gesture (click). Since we call this from a
    // button onClick, it's always triggered by a user gesture — fine.
    const result = await signInWithPopup(auth, googleProvider);

    // result.user is the signed-in Firebase User object
    // It contains: uid, email, displayName, photoURL, emailVerified, etc.
    // The uid is the permanent unique identifier for this user —
    // it NEVER changes even if the user changes their email or name
    // This is what we use as userId in Firestore and Storage paths
    return result.user;
}

export async function signOut(): Promise<void> {
    // firebaseSignOut() does 3 things:
    //   1. Clears the auth token from IndexedDB
    //   2. Fires onAuthStateChanged with null
    //   3. Invalidates the token on Firebase's servers
    //
    // After this, any Firestore or Storage call that requires auth
    // will be rejected by Firebase's security rules
    await firebaseSignOut(auth);
}

// ─────────────────────────────────────────────────────────────
// AUTH STATE LISTENER
// This is the core of Firebase Auth — replaces puter's checkAuthStatus()
// ─────────────────────────────────────────────────────────────
//
// onAuthStateChanged is an OBSERVER pattern (also called a subscription).
// You give it a callback, Firebase calls that callback:
//   - Immediately when you subscribe (with current state)
//   - Every time auth state changes (sign in, sign out, token refresh)
//
// It returns an UNSUBSCRIBE function — call it to stop listening.
// This is critical for React components — if you subscribe in a
// useEffect but never unsubscribe, the callback fires even after
// the component unmounts, causing "setState on unmounted component" warnings
// and potential memory leaks.
//
// Usage pattern in React:
//   useEffect(() => {
//       const unsubscribe = subscribeToAuthState((user) => {
//           setUser(user);
//       });
//       return unsubscribe; // React calls this on unmount — auto cleanup
//   }, []);
//
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
    // onAuthStateChanged returns the unsubscribe function directly
    // We return it so the caller can clean up when they're done listening
    return onAuthStateChanged(auth, callback);
}

// ─────────────────────────────────────────────────────────────
// GET CURRENT USER SYNCHRONOUSLY
// ─────────────────────────────────────────────────────────────
//
// auth.currentUser is a synchronous getter — no await needed.
// It returns the current User object if signed in, or null if not.
//
// IMPORTANT CAVEAT: This can return null during the initial loading
// state even if the user IS signed in, because Firebase hasn't
// finished restoring the session from IndexedDB yet.
//
// Safe to use AFTER you've confirmed auth state via subscribeToAuthState.
// Unsafe to use on first render before auth state is known.
//
export function getCurrentUser(): User | null {
    return auth.currentUser;
}