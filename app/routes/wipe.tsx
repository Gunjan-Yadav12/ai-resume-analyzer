// app/routes/wipe.tsx
// Deletes ALL data for the current user — Firestore documents + Storage files.
// BEFORE: puter.fs.readDir + puter.fs.delete + puter.kv.flush
// AFTER:  deleteAllUserResumes (Firestore) + deleteUserFiles (Storage)

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '~/lib/store';
import { deleteAllUserResumes } from '~/lib/firestore';
import { deleteUserFiles } from '~/lib/storage';
import Navbar from '~/components/Navbar';

// ─────────────────────────────────────────────────────────────
// WHY THIS PAGE EXISTS
// ─────────────────────────────────────────────────────────────
// During development you'll upload many test resumes.
// This page gives you a one-click way to clear all your data
// and start fresh without going into Firebase Console manually.
// In a real production app you'd either:
//   a) Remove this route entirely (too dangerous for real users)
//   b) Protect it behind an admin role check
//   c) Replace it with per-resume delete buttons on the home page
// For now it's useful for development and testing.
// ─────────────────────────────────────────────────────────────

type WipeStatus = 'idle' | 'confirming' | 'wiping' | 'done' | 'error';
// WHY A UNION TYPE INSTEAD OF MULTIPLE BOOLEANS?
//
// The naive approach uses multiple booleans:
//   const [isConfirming, setIsConfirming] = useState(false);
//   const [isWiping, setIsWiping] = useState(false);
//   const [isDone, setIsDone] = useState(false);
//   const [isError, setIsError] = useState(false);
//
// Problems with multiple booleans:
//   1. IMPOSSIBLE STATES — nothing prevents isWiping=true AND isDone=true
//      simultaneously. Your UI would have to handle a case that should
//      never exist. Bugs hide in impossible states.
//   2. VERBOSE — 4 useState calls, 4 setter calls, 4 checks in JSX
//   3. HARD TO REASON ABOUT — "what state is the component in right now?"
//      requires checking all 4 variables simultaneously
//
// With a union type:
//   const [status, setStatus] = useState<WipeStatus>('idle');
//   TypeScript enforces exactly ONE of the 5 values at all times.
//   Impossible states are literally unrepresentable in the type system.
//   setStatus('wiping') — one line, unambiguous, type-safe.
//   This pattern is called "making illegal states unrepresentable" —
//   one of the most important principles in type-driven development.

export default function Wipe() {
    const { user, isLoading: authLoading } = useAuthStore();
    const navigate = useNavigate();
    const [status, setStatus] = useState<WipeStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleWipe = async () => {
        if (!user) return navigate('/auth');

        setStatus('wiping');
        setError(null);

        try {
            // ─────────────────────────────────────────────────
            // DELETE ORDER MATTERS
            // ─────────────────────────────────────────────────
            // We delete Firestore documents FIRST, then Storage files.
            // Here's why order matters:
            //
            // If we deleted Storage files first and then Firestore failed:
            //   → Firestore docs exist but point to deleted Storage URLs
            //   → Home page shows resume cards with broken image URLs
            //   → Confusing state — looks like data exists but is corrupted
            //
            // If we delete Firestore first and then Storage fails:
            //   → No Firestore docs exist → home page shows "no resumes"
            //   → Storage files are orphaned (exist but unreachable from app)
            //   → Clean from user's perspective, minor storage waste
            //   → Orphaned files can be cleaned up later with a Cloud Function
            //
            // The second failure mode is less bad for UX — user sees a clean
            // empty state rather than corrupted data. Always delete the
            // "pointer" (Firestore doc) before the "target" (Storage file).
            // This principle applies broadly: delete references before data.

            // Step 1: Delete all Firestore resume documents for this user
            // This calls deleteDoc() in parallel for every resume document
            await deleteAllUserResumes(user.uid);

            // Step 2: Delete all Storage files for this user
            // This deletes everything under resumes/{uid}/ and images/{uid}/
            await deleteUserFiles(user.uid);

            setStatus('done');

            // Redirect to home after 2 seconds so user sees confirmation
            // WHY setTimeout AND NOT immediate navigate()?
            // If we navigate immediately, the user never sees "done" state.
            // 2 seconds is enough to read "All data deleted" without feeling
            // like they're waiting. This is called "feedback delay" —
            // giving users just enough time to register what happened.
            setTimeout(() => navigate('/'), 2000);

        } catch (err) {
            console.error('Wipe failed:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to delete data'
            );
            setStatus('error');
        }
        // NO finally{} here intentionally.
        // Unlike upload.tsx where we always want to reset isProcessing,
        // here we want to STAY in 'done' or 'error' state after completion.
        // finally{} would reset status to something we don't want here.
        // Only use finally{} when you always need cleanup regardless of outcome.
        // Here the outcome (done vs error) IS the state we want to show.
    };

    // Auth loading
    if (authLoading) return null;

    // Not signed in
    if (!user) {
        navigate('/auth');
        return null;
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16 flex flex-col items-center gap-6">

                    <h1>Danger Zone</h1>
                    <p className="text-gray-600 text-center max-w-md">
                        This will permanently delete all your resume analyses,
                        uploaded PDFs, and preview images. This cannot be undone.
                    </p>

                    {/* ── IDLE STATE — first button, no confirmation yet ── */}
                    {status === 'idle' && (
                        <button
                            onClick={() => setStatus('confirming')}
                            className="bg-red-500 hover:bg-red-600 text-white
                                       px-6 py-3 rounded-lg font-medium
                                       transition-colors duration-200"
                        >
                            Delete All My Data
                        </button>
                    )}

                    {/* ── CONFIRMING STATE — two-step confirmation ── */}
                    {status === 'confirming' && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-red-600 font-semibold">
                                Are you absolutely sure? This cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                {/*
                                    TWO-STEP CONFIRMATION PATTERN
                                    The original wipe.tsx had no confirmation —
                                    one click deleted everything permanently.
                                    This is a critical UX bug identified in
                                    the analysis. The two-step pattern forces
                                    the user to make TWO distinct intentional
                                    actions before irreversible deletion.
                                    Used by GitHub for repo deletion,
                                    AWS for account deletion, etc.
                                    The "Cancel" option also gives an easy
                                    escape — important for accidental clicks.
                                */}
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="px-6 py-3 rounded-lg border
                                               border-gray-300 hover:bg-gray-50
                                               transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWipe}
                                    className="bg-red-500 hover:bg-red-600
                                               text-white px-6 py-3 rounded-lg
                                               font-medium transition-colors
                                               duration-200"
                                >
                                    Yes, Delete Everything
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── WIPING STATE — in progress ── */}
                    {status === 'wiping' && (
                        <div className="flex flex-col items-center gap-3">
                            {/*
                                Simple CSS spinner — no library needed.
                                animate-spin is a Tailwind utility that applies:
                                @keyframes spin { to { transform: rotate(360deg) } }
                                The border-t-transparent creates the "gap"
                                in the circle that makes it look like a spinner
                                rather than a solid ring.
                            */}
                            <div className="w-8 h-8 border-4 border-red-500
                                           border-t-transparent rounded-full
                                           animate-spin" />
                            <p className="text-gray-600">
                                Deleting all data...
                            </p>
                        </div>
                    )}

                    {/* ── DONE STATE — success confirmation ── */}
                    {status === 'done' && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full
                                           flex items-center justify-center">
                                <img
                                    src="/icons/check.svg"
                                    alt="Done"
                                    className="w-6 h-6"
                                />
                            </div>
                            <p className="text-green-600 font-medium">
                                All data deleted successfully.
                            </p>
                            <p className="text-gray-500 text-sm">
                                Redirecting to home...
                            </p>
                        </div>
                    )}

                    {/* ── ERROR STATE — show what went wrong ── */}
                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-red-500">{error}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-6 py-3 rounded-lg border
                                               border-gray-300 hover:bg-gray-50
                                               transition-colors duration-200"
                                >
                                    Go Home
                                </button>
                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setError(null);
                                    }}
                                    className="primary-button"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </section>
        </main>
    );
}