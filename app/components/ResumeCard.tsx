// app/components/ResumeCard.tsx
// Displays a single resume card on the home page.
// BEFORE: puter.fs.read(imagePath) → Blob → createObjectURL → memory leak
// AFTER:  resume.imageUrl is already a permanent HTTPS URL → use directly

import { useNavigate } from 'react-router';
import type { ResumeDocument } from '~/lib/firestore';
import ScoreCircle from '~/components/ScoreCircle';

interface ResumeCardProps {
    resume: ResumeDocument;
}

export default function ResumeCard({ resume }: ResumeCardProps) {
    const navigate = useNavigate();

    // ─────────────────────────────────────────────────────────
    // WHY THIS COMPONENT IS NOW DRAMATICALLY SIMPLER
    // ─────────────────────────────────────────────────────────
    //
    // BEFORE — what this component had to do with Puter:
    //
    //   const [imageUrl, setImageUrl] = useState<string>('');
    //   const { fs } = usePuterStore();
    //
    //   useEffect(() => {
    //       const loadImage = async () => {
    //           const blob = await fs.read(resume.imagePath); // network call
    //           const url = URL.createObjectURL(blob);        // allocates memory
    //           setImageUrl(url);                             // triggers re-render
    //       };
    //       loadImage();
    //       // BUG: no cleanup → URL.revokeObjectURL never called → memory leak
    //       // Every card on the home page leaked memory on every page load
    //   }, [resume.imagePath]);
    //
    // AFTER — what this component does with Firebase:
    //
    //   <img src={resume.imageUrl} />
    //   // That's it. The URL is already there. No network call in the component.
    //   // No useState. No useEffect. No memory allocation. No memory leak.
    //   // The browser's built-in HTTP cache handles caching automatically.
    //
    // This is a fundamental architectural win — moving complexity OUT of
    // components and INTO the data layer (where it belongs).
    // Components should DISPLAY data. They should not FETCH or TRANSFORM it.
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────
    // SAFE FEEDBACK ACCESS
    // ─────────────────────────────────────────────────────────
    // resume.feedback can be null if:
    //   - The pre-save happened but AI call didn't complete yet
    //   - The AI call failed
    //   - The record is from a failed upload session
    //
    // We use optional chaining (?.) throughout to safely access
    // nested properties without crashing if feedback is null.
    //
    // Without optional chaining:
    //   resume.feedback.overallScore → TypeError: Cannot read
    //   properties of null if feedback is null → white screen crash
    //
    // With optional chaining:
    //   resume.feedback?.overallScore → returns undefined if
    //   feedback is null → no crash → graceful fallback
    const overallScore = resume.feedback?.overallScore ?? 0;
    const hasFeedback = resume.feedback !== null && resume.feedback !== undefined;

    return (
        <div
            // The entire card is clickable — not just a button inside it.
            // onClick on a div is acceptable for card-style UI where the
            // whole surface area should be interactive.
            // For accessibility, we add role="button" and tabIndex={0}
            // so keyboard users can Tab to the card and press Enter/Space.
            // Without these, screen readers announce it as a "div" (non-interactive)
            // and keyboard users can't reach it without a mouse.
            onClick={() => navigate(`/resume/${resume.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                // onKeyDown handles keyboard activation.
                // Enter (key === 'Enter') — standard button activation
                // Space (key === ' ') — also standard for button-role elements
                // Without this, keyboard users can Tab to the card but
                // pressing Enter does nothing — broken accessibility.
                if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/resume/${resume.id}`);
                }
            }}
            className="resume-card cursor-pointer hover:shadow-lg
                       transition-shadow duration-200 focus:outline-none
                       focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            // focus:ring-* classes add a visible focus indicator for keyboard users.
            // This is required by WCAG 2.1 AA accessibility standards.
            // Never use outline: none without providing an alternative
            // focus indicator — it makes your app unusable for keyboard users.
        >
            {/* ── RESUME PREVIEW IMAGE ── */}
            <div className="resume-img-div">
                {resume.imageUrl ? (
                    <img
                        src={resume.imageUrl}
                        // alt text describes the image for screen readers.
                        // For a resume preview, describe what it IS, not what it SHOWS.
                        // "Resume preview" is better than "" (empty, which screen readers
                        // announce as the filename) or "image" (redundant).
                        alt={`Resume preview for ${resume.jobTitle} at ${resume.companyName}`}
                        className="w-full h-full object-cover object-top"
                        // object-top ensures the TOP of the resume image is visible
                        // (name, contact info, summary) rather than the middle or bottom.
                        // Resumes are top-heavy — the most important content is at the top.

                        // loading="lazy" tells the browser to defer loading this image
                        // until it's near the viewport. On a home page with 10+ resume
                        // cards, this means only visible cards load their images immediately.
                        // Images below the fold load as the user scrolls down.
                        // This significantly improves initial page load time.
                        loading="lazy"
                    />
                ) : (
                    // Fallback when imageUrl is missing (failed upload, null feedback)
                    // Shows a placeholder instead of a broken image icon.
                    <div className="w-full h-full bg-gray-100 flex items-center
                                   justify-center">
                        <img
                            src="/images/pdf.png"
                            alt="PDF document"
                            className="w-16 h-16 opacity-50"
                        />
                    </div>
                )}
            </div>

            {/* ── CARD CONTENT ── */}
            <div className="resume-info">
                {/* Job title and company */}
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                        {resume.jobTitle}
                    </h3>
                    {/*
                        truncate applies:
                          overflow: hidden
                          text-overflow: ellipsis
                          white-space: nowrap
                        Long job titles ("Senior Principal Software Engineer")
                        get cut to "Senior Principal Software Eng..." instead
                        of wrapping and breaking the card layout.
                    */}
                    <p className="text-sm text-gray-500 truncate">
                        {resume.companyName}
                    </p>
                </div>

                {/* Score display */}
                <div className="flex items-center justify-between mt-3">
                    {hasFeedback ? (
                        // ScoreCircle renders the animated circular score gauge
                        // We pass the score as a number (0-100)
                        <ScoreCircle score={overallScore} />
                    ) : (
                        // No feedback yet — analysis incomplete or failed
                        <span className="text-xs text-gray-400 italic">
                            Analysis pending
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}