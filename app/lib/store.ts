// app/lib/store.ts
// Replaces app/lib/puter.ts
// Central state management for auth using Zustand
// Every component that needs to know "who is logged in" reads from here

import { create } from 'zustand';
import { type User } from 'firebase/auth';
import { signInWithGoogle, signOut, subscribeToAuthState } from '~/lib/auth';

// ─────────────────────────────────────────────────────────────
// UNDERSTANDING THE 3 AUTH STATES
// ─────────────────────────────────────────────────────────────
//
// Your app has exactly 3 possible auth states at any moment.
// Getting this wrong causes UI flashes and incorrect redirects.
//
// State 1: LOADING
//   user: null, isLoading: true
//   Meaning: Firebase is checking IndexedDB for a saved session.
//   UI should show: a loading spinner, nothing, or skeleton screens.
//   Duration: 100-400ms on first load.
//
// State 2: SIGNED IN
//   user: User object, isLoading: false
//   Meaning: Firebase confirmed a valid session exists.
//   UI should show: the app, user's name/avatar, sign out button.
//
// State 3: SIGNED OUT
//   user: null, isLoading: false
//   Meaning: No session exists OR session expired OR user signed out.
//   UI should show: sign in button, redirect to auth page.
//
// The difference between State 1 and State 3 is ONLY isLoading.
// Both have user: null. If you only check `if (!user) redirect to login`
// without checking isLoading, you'll redirect to login on EVERY page load
// for 300ms before Firebase restores the session. This is the most common
// Firebase Auth bug beginners make.
// ─────────────────────────────────────────────────────────────

interface AuthStore {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    init: () => () => void; // returns the unsubscribe function
}

export const useAuthStore = create<AuthStore>((set) => ({
    // Initial state — always start as LOADING
    // Never start as signed out because Firebase might restore a session.
    // Starting as signed out causes the auth redirect flash described above.
    user: null,
    isLoading: true,
    error: null,

    signIn: async () => {
        set({ error: null });
        try {
            // signInWithGoogle() opens the Google popup
            // Firebase automatically updates auth state when it resolves
            // which triggers onAuthStateChanged, which updates our store
            // So we DON'T need to call set({ user: result }) here —
            // the subscription handles it. Doing it twice would cause
            // two re-renders for no reason.
            await signInWithGoogle();
        } catch (err) {
            // Common errors:
            // auth/popup-closed-by-user — user closed popup without signing in
            // auth/popup-blocked — browser blocked the popup
            // auth/cancelled-popup-request — another popup was opened
            // We show the error but don't crash — user can try again
            const message = err instanceof Error ? err.message : 'Sign in failed';
            set({ error: message });
        }
    },

    signOut: async () => {
        set({ error: null });
        try {
            await signOut();
            // Again — don't manually set user: null here.
            // Firebase fires onAuthStateChanged with null after signOut(),
            // which our subscription picks up and sets user: null automatically.
            // Manual set here would just cause an extra unnecessary re-render.
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign out failed';
            set({ error: message });
        }
    },

    // init() sets up the Firebase auth subscription
    // It must be called ONCE when the app starts (in root.tsx)
    // It returns the unsubscribe function so root.tsx can clean up
    //
    // WHY RETURN UNSUBSCRIBE FROM THE STORE?
    // The store itself can't clean up — it has no lifecycle.
    // Only React components have lifecycle (mount/unmount).
    // So init() sets up the subscription and hands the cleanup
    // function back to the caller (root.tsx's useEffect) which
    // knows when to clean up via its return value.
    init: () => {
        const unsubscribe = subscribeToAuthState((user) => {
            // This callback fires:
            //   1. Immediately on subscription (with current auth state)
            //   2. Every time auth state changes
            //
            // When user is NOT null → signed in → set user, stop loading
            // When user IS null → signed out (or still loading on first call,
            //   but we set isLoading: false regardless because Firebase
            //   guarantees this callback fires at least once with the
            //   definitive state before returning null for "not signed in")
            set({
                user,
                isLoading: false,
                error: null,
            });
        });

        // Return the unsubscribe function to the caller
        return unsubscribe;
    },
}));