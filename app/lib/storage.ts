// app/lib/storage.ts
// Replaces Firebase Storage with Cloudinary for file uploads.
// Cloudinary is used because Firebase Storage requires a paid plan.
// Cloudinary's free tier gives 25GB storage with no credit card.

// ─────────────────────────────────────────────────────────────
// HOW CLOUDINARY UNSIGNED UPLOADS WORK
// ─────────────────────────────────────────────────────────────
//
// Normally uploading to a cloud service requires an API secret
// to prove you're authorized. But API secrets can't live in
// browser code — anyone can read your JS bundle.
//
// Cloudinary's solution: unsigned upload presets.
// A preset is a server-side configuration that says:
//   "Files uploaded with preset name X are allowed, with these rules:
//    - Max size: 10MB
//    - Allowed formats: pdf, png, jpg
//    - Store in folder: resume_analyzer"
//
// Your browser sends: file + preset name (public, not secret)
// Cloudinary checks: does this preset exist? yes → accept upload
// No secret needed. Security comes from preset configuration.
//
// The upload endpoint is a standard HTTPS POST to:
//   https://api.cloudinary.com/v1_1/{cloudName}/auto/upload
//   ↑ "auto" means Cloudinary detects file type automatically
//     (pdf, png, jpg etc.) and stores it appropriately
// ─────────────────────────────────────────────────────────────

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ─────────────────────────────────────────────────────────────
// UNDERSTANDING CLOUDINARY'S RESPONSE SHAPE
// ─────────────────────────────────────────────────────────────
// When you upload a file, Cloudinary returns a JSON object.
// The most important fields:
//
// secure_url  → permanent HTTPS URL to access the file
//               e.g. "https://res.cloudinary.com/dxyz/image/upload/v1/resume_analyzer/abc.pdf"
//               This is what you store in Firestore and use in <img src>
//
// public_id   → Cloudinary's internal identifier for the file
//               e.g. "resume_analyzer/abc-uuid"
//               Used if you want to delete or transform the file later
//               through Cloudinary's API
//
// format      → detected file format ("pdf", "png", "jpg")
// bytes       → file size in bytes
// width/height → dimensions (for images)
// created_at  → upload timestamp
// ─────────────────────────────────────────────────────────────
interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    format: string;
    bytes: number;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────
// CORE UPLOAD FUNCTION
// All uploads go through this one function.
// uploadResumePdf and uploadResumeImage are thin wrappers around it.
// WHY ONE CORE FUNCTION?
// DRY — Don't Repeat Yourself. The upload logic is identical for
// PDFs and images. Only the metadata (what we tag the file with)
// differs slightly. One function, two callers.
// ─────────────────────────────────────────────────────────────
async function uploadToCloudinary(
    file: File,
    userId: string,
    resumeId: string,
    // publicId lets us control the filename in Cloudinary.
    // Without it, Cloudinary generates a random ID.
    // With it, we can find/delete files later by known ID.
    // Format: "resume_analyzer/resumes/userId/resumeId"
    publicId: string
): Promise<string> {

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
            'Cloudinary config missing. Check VITE_CLOUDINARY_CLOUD_NAME ' +
            'and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
        );
    }

    // FormData is the browser API for constructing multipart/form-data requests.
    // This is the same format as HTML <form enctype="multipart/form-data">.
    // Cloudinary's upload API requires multipart/form-data — not JSON.
    // WHY MULTIPART AND NOT JSON?
    // Binary file data (PDFs, images) cannot be represented in JSON directly.
    // JSON is text-only. You COULD base64-encode the file and put it in JSON,
    // but that increases file size by ~33% (base64 overhead).
    // Multipart sends binary data as-is — no encoding overhead, much faster.
    const formData = new FormData();

    // 'file' is Cloudinary's required field name for the file being uploaded
    formData.append('file', file);

    // 'upload_preset' tells Cloudinary which preset's rules to apply
    formData.append('upload_preset', UPLOAD_PRESET);

    // 'public_id' sets the file's identifier and path in Cloudinary
    // Using userId/resumeId makes files organized and findable
    formData.append('public_id', publicId);

    // 'context' stores arbitrary metadata as key=value pairs
    // This metadata is searchable in Cloudinary's dashboard
    // Useful for debugging: "which user uploaded this file?"
    formData.append('context', `userId=${userId}|resumeId=${resumeId}`);

    // The upload URL uses 'auto' resource type — Cloudinary detects
    // whether it's an image, video, raw file (PDF) automatically.
    // Alternative resource types: 'image', 'video', 'raw'
    // 'auto' is safest when uploading mixed types (PDFs + PNGs)
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

    const response = await fetch(uploadUrl, {
        method: 'POST',
        // DO NOT set Content-Type header manually when using FormData.
        // This is a common mistake that breaks multipart uploads.
        //
        // WHY? When you set Content-Type manually to 'multipart/form-data',
        // you're missing the "boundary" parameter that the browser adds
        // automatically. The boundary is a random string that separates
        // each field in the multipart body:
        //   Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123
        // Without the boundary, the server can't parse the body.
        // Leaving Content-Type unset lets the browser set it correctly
        // with the boundary included — always do this with FormData.
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
            `Cloudinary upload failed ${response.status}: ` +
            JSON.stringify(errorBody)
        );
    }

    const data: CloudinaryResponse = await response.json();

    // secure_url is always HTTPS — never HTTP.
    // Cloudinary enforces this — even if you somehow got an http:// URL,
    // you could change it to https:// and it would work.
    // We store this URL in Firestore — it never expires, never changes.
    return data.secure_url;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API — these are what upload.tsx imports and calls
// ─────────────────────────────────────────────────────────────

export async function uploadResumePdf(
    file: File,
    userId: string,
    resumeId: string
): Promise<string> {
    // Public ID structure: folder/subfolder/filename
    // Cloudinary uses / as a folder separator — this creates
    // a virtual folder structure in your Cloudinary media library
    // resumes/userId/resumeId → easy to find all files for a user
    const publicId = `resume_analyzer/resumes/${userId}/${resumeId}`;
    return uploadToCloudinary(file, userId, resumeId, publicId);
}

export async function uploadResumeImage(
    file: File,
    userId: string,
    resumeId: string
): Promise<string> {
    const publicId = `resume_analyzer/images/${userId}/${resumeId}`;
    return uploadToCloudinary(file, userId, resumeId, publicId);
}

// ─────────────────────────────────────────────────────────────
// DELETE USER FILES
// ─────────────────────────────────────────────────────────────
// Cloudinary deletion from the browser requires the API Secret
// to generate a signed deletion request — which we can't do
// client-side safely. So for wipe.tsx we have two options:
//
// OPTION 1 (current): Only delete Firestore records from the browser.
//   Files remain in Cloudinary but are "orphaned" — no Firestore
//   record points to them so they never appear in the UI.
//   Cloudinary's free tier has 25GB — orphaned files are a minor issue.
//
// OPTION 2 (production): Use a Firebase Cloud Function or a small
//   backend endpoint that holds the API Secret server-side,
//   receives a list of public_ids, and deletes them via
//   Cloudinary's Admin API. This is the correct production approach.
//
// We implement Option 1 for now and log a warning.
// The deleteAllUserResumes() in firestore.ts handles the DB cleanup.
// ─────────────────────────────────────────────────────────────
export async function deleteUserFiles(userId: string): Promise<void> {
    // Files remain in Cloudinary — only Firestore records are deleted
    // by deleteAllUserResumes() in wipe.tsx.
    // This is acceptable for a portfolio project.
    console.warn(
        `Files for user ${userId} remain in Cloudinary storage. ` +
        `Cloudinary file deletion requires server-side API Secret. ` +
        `Files are orphaned but not accessible through the app.`
    );
    // No-op — returns immediately.
    // wipe.tsx calls this then deleteAllUserResumes() — the Firestore
    // cleanup still happens correctly. Only Storage cleanup is skipped.
}