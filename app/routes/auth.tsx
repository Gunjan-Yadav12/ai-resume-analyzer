// app/routes/auth.tsx
// The sign-in page.
// Shown when a user is not authenticated and tries to access the app.
// After successful sign-in, redirects to home.

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '~/lib/store';

export default function Auth() {
    const { user, isLoading, error, signIn } = useAuthStore();
    const navigate = useNavigate();

    // ─────────────────────────────────────────────────────────
    // REDIRECT LOGIC — the most important part of this component
    // ─────────────────────────────────────────────────────────
    //
    // We watch for user AND isLoading together.
    // Here is every possible state combination and what we do:
    //
    // isLoading=true,  user=null  → Firebase checking session → do nothing
    // isLoading=false, user=null  → Confirmed signed out → stay on auth page
    // isLoading=false, user=User  → Signed in → redirect to home
    // isLoading=true,  user=User  → Impossible state (loading resolves to
    //                               either null or User, never keeps loading
    //                               after user is known) — handle anyway
    //
    // WHY useEffect FOR REDIRECT and not just `if (user) navigate('/')`?
    //
    // Rendering functions (the component body) must be PURE — they describe
    // what the UI looks like, they must not cause side effects like navigation.
    // navigate() IS a side effect — it changes browser history.
    // React enforces this by running the render function multiple times
    // in development (Strict Mode) to catch accidental side effects.
    // If you call navigate() directly in the render body, it fires twice
    // in development, causing double navigation and React warnings.
    // useEffect is the correct place for ALL side effects in React.
    useEffect(() => {
        if (!isLoading && user) {
            navigate('/');
        }
    }, [user, isLoading, navigate]);
    // Dependency array explanation:
    // [user]      — re-run when user changes (null → User after sign in)
    // [isLoading] — re-run when loading finishes (true → false)
    // [navigate]  — listed because it's used inside the effect.
    //               navigate's reference is stable (never changes) so
    //               including it doesn't cause extra re-runs. ESLint's
    //               exhaustive-deps rule requires it regardless.

    // ─────────────────────────────────────────────────────────
    // LOADING STATE — show nothing while Firebase checks session
    // ─────────────────────────────────────────────────────────
    //
    // WHY RETURN NULL AND NOT A SPINNER?
    // This loading state lasts 100-400ms maximum.
    // Showing a spinner for 200ms then immediately redirecting to home
    // creates a jarring flash. Returning null renders a blank screen
    // for that 200ms — much less noticeable than a spinner appearing
    // and disappearing instantly.
    //
    // For longer loading states (data fetching, file uploads) a spinner
    // or skeleton screen is appropriate. For auth state restoration
    // which is always sub-500ms, null is the better UX choice.
    if (isLoading) return null;

    // ─────────────────────────────────────────────────────────
    // SIGNED IN STATE — redirect handled by useEffect above
    // Return null here to prevent flashing the auth UI for the
    // brief moment between render and useEffect running
    // ─────────────────────────────────────────────────────────
    //
    // WHY CAN THIS RENDER EVEN AFTER useEffect REDIRECTS?
    // React's render cycle:
    //   1. Component renders (this function runs) — returns JSX
    //   2. React updates the DOM
    //   3. useEffect runs AFTER DOM update
    //
    // So there's always at least one render BEFORE useEffect fires.
    // If we returned the sign-in form here when user exists, the user
    // would see the sign-in page flash for one frame before navigating.
    // Returning null prevents that one-frame flash.
    if (user) return null;

    return (
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen">
            <section className="flex flex-col items-center justify-center min-h-screen gap-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <h1 className="text-4xl font-bold">AI Resume Analyzer</h1>
                    <p className="text-gray-600 max-w-md">
                        Get instant AI-powered feedback on your resume.
                        Sign in with Google to get started — it's free.
                    </p>
                </div>

                {/* Error display — shows if sign-in popup fails */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-sm text-center text-sm">
                        {/*
                            We display raw error messages here for debugging.
                            In production you'd map Firebase error codes to
                            user-friendly messages:
                            auth/popup-closed-by-user → "Sign-in was cancelled"
                            auth/popup-blocked → "Please allow popups for this site"
                            auth/network-request-failed → "Check your connection"
                        */}
                        {error}
                    </div>
                )}

                <button
                    onClick={signIn}
                    className="primary-button flex items-center gap-3 px-6 py-3"
                >
                    {/*
                        Inline SVG for Google's logo — no external image request.
                        The G logo is trademarked by Google but permitted for use
                        in "Sign in with Google" buttons per Google's branding
                        guidelines (developers.google.com/identity/branding-guidelines).
                        Using it correctly (with the text "Sign in with Google")
                        is required — you cannot use it for other purposes.
                    */}
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
                    </svg>
                    Sign in with Google
                </button>
            </section>
        </main>
    );
}