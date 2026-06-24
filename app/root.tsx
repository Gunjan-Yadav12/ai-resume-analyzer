// app/root.tsx
// The root of the entire React application.
// Every page renders inside this file — it wraps everything.
// This is where we initialize Firebase auth ONCE for the whole app.

import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useNavigate,
} from 'react-router';
import { useEffect } from 'react';
import { useAuthStore } from '~/lib/store';
import type { Route } from './+types/root';
import stylesheet from './app.css?url';

// ─────────────────────────────────────────────────────────────
// WHY THESE EXPORTS EXIST
// ─────────────────────────────────────────────────────────────
// React Router v7 uses file-based conventions.
// `links` export tells React Router what <link> tags to put in <head>
// for THIS route. Root-level links apply to every page.
// The ?url suffix on the import is a Vite feature — it gives you
// the hashed URL of the CSS file (e.g. /assets/app-Bx3kL9.css)
// instead of inlining the CSS content into JS.
export const links: Route.LinksFunction = () => [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
    },
    {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Mona+Sans:ital,wdth,wght@0,75..125,200..900;1,75..125,200..900&display=swap',
    },
    { rel: 'stylesheet', href: stylesheet },
];

// ─────────────────────────────────────────────────────────────
// THE LAYOUT COMPONENT
// Everything inside Layout wraps every single page in the app.
// Outlet is where the actual page content renders.
// ─────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
                {/*
                    REMOVED: <script src="https://js.puter.com/v2/" />
                    Puter required loading their entire SDK from their CDN
                    on every page load — even pages that don't use Puter at all.
                    That script was ~200KB of JavaScript blocking your page render.

                    Firebase is imported as npm packages instead — Vite
                    tree-shakes unused code and splits the bundle intelligently.
                    Only the Firebase modules you actually import get included.
                */}
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

// ─────────────────────────────────────────────────────────────
// APP INITIALIZER COMPONENT
// Separate component so we can use hooks (useEffect, useNavigate)
// Layout above cannot use hooks because it's not inside the
// React Router context yet — hooks that depend on router context
// (like useNavigate) would throw if called in Layout.
// ─────────────────────────────────────────────────────────────
function AppInitializer() {
    const init = useAuthStore((state) => state.init);
    const navigate = useNavigate();

    useEffect(() => {
        // init() starts the Firebase auth subscription.
        // It returns the unsubscribe function.
        // We return it from useEffect so React calls it automatically
        // when the component unmounts (or before the effect re-runs).
        //
        // WHY CALL init() HERE AND NOT IN THE STORE DIRECTLY?
        // The store is created outside React — it has no lifecycle.
        // useEffect has a lifecycle tied to the component:
        //   - Runs after first render (subscribe)
        //   - Cleanup runs on unmount (unsubscribe)
        // This guarantees exactly one subscription exists at all times.
        const unsubscribe = init();
        return unsubscribe;
    }, [init]);
    // [init] in the dependency array means: re-run this effect if init
    // function changes. Since init comes from Zustand and never changes
    // reference, this effect runs exactly once. The array is not empty []
    // because ESLint's exhaustive-deps rule correctly requires us to list
    // all values used inside the effect — init is used, so it's listed.

    return null; // This component renders nothing — it only runs side effects
}

// ─────────────────────────────────────────────────────────────
// DEFAULT EXPORT — The main App component
// React Router renders this for every route
// ─────────────────────────────────────────────────────────────
export default function App() {
    return (
        <>
            {/*
                AppInitializer runs once at app start and sets up
                Firebase auth listening. It renders nothing visible.
                Putting it here (inside App, not Layout) means it has
                access to React Router's context — required for useNavigate.
            */}
            <AppInitializer />

            {/*
                Outlet renders the actual page component for the current URL.
                / → home.tsx
                /upload → upload.tsx
                /resume/:id → resume.tsx
                /auth → auth.tsx
            */}
            <Outlet />
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// React Router renders this when any route throws an unhandled error
// or when a loader/action returns a Response with an error status
// ─────────────────────────────────────────────────────────────
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = 'Oops!';
    let details = 'An unexpected error occurred.';
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        // isRouteErrorResponse catches HTTP-style errors (404, 403, 500)
        // thrown from route loaders/actions using React Router's `throw`
        message = error.status === 404 ? '404' : 'Error';
        details =
            error.status === 404
                ? 'The requested page could not be found.'
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        // In development, show the full error + stack trace
        // import.meta.env.DEV is true in `vite dev`, false in `vite build`
        // We never show stack traces in production — they leak implementation
        // details that could help an attacker understand your codebase
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}