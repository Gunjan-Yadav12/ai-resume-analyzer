// app/lib/firestore.ts
// Replaces puter.kv.set(), puter.kv.get(), puter.kv.list(), puter.kv.flush()
// All resume metadata (scores, feedback, paths) is stored in Firestore

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    type Timestamp,
} from 'firebase/firestore';
import { db } from '~/lib/firebase';

// ─────────────────────────────────────────────────────────────
// FIRESTORE DATA MODEL — understand this before anything else
// ─────────────────────────────────────────────────────────────
//
// Firestore is a document database, NOT a key-value store.
// The hierarchy is: Database → Collections → Documents → Fields
//
// Your data will look like this:
//
// resumes/                          ← Collection (like a table)
//   {resumeId}/                     ← Document (like a row)
//     id: "abc-uuid"
//     userId: "firebase-uid-123"    ← WHO owns this resume
//     companyName: "Google"
//     jobTitle: "Frontend Dev"
//     jobDescription: "..."
//     resumeUrl: "https://..."      ← Firebase Storage URL for PDF
//     imageUrl: "https://..."       ← Firebase Storage URL for image
//     feedback: { ... }            ← The full AI feedback object
//     createdAt: Timestamp          ← When it was uploaded
//
// The userId field is what fixes the bug from your Puter version
// where ALL users could see ALL resumes. With Firestore security rules
// (set up later), you'll enforce that users can only query documents
// where userId == their own uid.
// ─────────────────────────────────────────────────────────────

// This is the shape of a resume document in Firestore
// Keeping it here means every function in this file agrees on the structure
export interface ResumeDocument {
    id: string;
    userId: string;
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    resumeUrl: string;   // permanent Firebase Storage URL — replaces resumePath
    imageUrl: string;    // permanent Firebase Storage URL — replaces imagePath
    feedback: any;       // the parsed Feedback object from Gemini
    createdAt?: Timestamp;
}

// ─────────────────────────────────────────────────────────────
// SAVE A RESUME
// Replaces: await kv.set(`resume:${uuid}`, JSON.stringify(data))
// ─────────────────────────────────────────────────────────────
export async function saveResume(resume: ResumeDocument): Promise<void> {
    // collection(db, 'resumes') gets a reference to the 'resumes' collection
    // doc(collectionRef, id) gets a reference to a specific document by ID
    //
    // WHY NOT doc(db, 'resumes', resume.id) directly?
    // You CAN do that — it's shorthand for the same thing.
    // We use the two-step form here to make the collection reference
    // explicit and readable. Both produce identical results.
    const resumeRef = doc(collection(db, 'resumes'), resume.id);

    // setDoc() CREATES or OVERWRITES the document completely
    // This is equivalent to kv.set() — it doesn't care if the document
    // already exists, it just writes whatever you give it.
    //
    // serverTimestamp() is a special Firestore sentinel value.
    // It tells Firestore: "fill this field with the server's current time
    // when you process this write." This is better than Date.now() because:
    //   - Client clocks can be wrong (user changed system time, timezone issues)
    //   - All timestamps use the same authoritative source (Firebase servers)
    //   - Firestore uses this for consistent ordering across all documents
    //
    // The spread { ...resume } copies all fields, then createdAt overrides
    // any createdAt that might already be in the resume object
    await setDoc(resumeRef, {
        ...resume,
        createdAt: serverTimestamp(),
    });
}

// ─────────────────────────────────────────────────────────────
// GET A SINGLE RESUME BY ID
// Replaces: JSON.parse(await kv.get(`resume:${id}`))
// ─────────────────────────────────────────────────────────────
export async function getResume(resumeId: string): Promise<ResumeDocument | null> {
    const resumeRef = doc(collection(db, 'resumes'), resumeId);

    // getDoc() fetches a single document
    // It ALWAYS returns a DocumentSnapshot — even if the document doesn't exist
    // You MUST check docSnap.exists() before reading data
    // If you skip the check and call docSnap.data() on a non-existent doc,
    // you get undefined — TypeScript won't catch this at compile time
    const docSnap = await getDoc(resumeRef);

    if (!docSnap.exists()) return null;

    // docSnap.data() returns the document's fields as a plain object
    // We cast it to ResumeDocument — Firestore has no runtime type checking
    // so you're responsible for ensuring the data matches your interface
    return docSnap.data() as ResumeDocument;
}

// ─────────────────────────────────────────────────────────────
// GET ALL RESUMES FOR A USER
// Replaces: (await kv.list('resume:*', true)) as KVItem[]
// This FIXES the bug where all users saw all resumes
// ─────────────────────────────────────────────────────────────
export async function getUserResumes(userId: string): Promise<ResumeDocument[]> {
    // query() builds a Firestore query — it does NOT execute it yet
    // Think of it as constructing a SQL SELECT statement before running it
    //
    // collection(db, 'resumes')     → FROM resumes
    // where('userId', '==', userId) → WHERE userId = ?
    // orderBy('createdAt', 'desc')  → ORDER BY createdAt DESC
    //
    // WHY orderBy with createdAt DESC?
    // Without orderBy, Firestore returns documents in an undefined order.
    // DESC means newest resume appears first — better UX for the home page.
    //
    // IMPORTANT: This query requires a Firestore COMPOSITE INDEX
    // (combining userId + createdAt in one index).
    // Firestore will throw an error with a direct link to create it
    // the first time this query runs — click that link and it auto-creates.
    // We'll handle this in the security rules step.
    const resumesQuery = query(
        collection(db, 'resumes'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    // getDocs() EXECUTES the query and returns a QuerySnapshot
    // QuerySnapshot is NOT an array — it's a snapshot of matching documents
    // You iterate it with .docs (array of DocumentSnapshots) or .forEach()
    const querySnapshot = await getDocs(resumesQuery);

    // .docs gives us the array of DocumentSnapshot objects
    // We map each to its data, cast to our type
    // This gives us a clean ResumeDocument[] array to work with in components
    return querySnapshot.docs.map((doc) => doc.data() as ResumeDocument);
}

// ─────────────────────────────────────────────────────────────
// DELETE A SINGLE RESUME
// New functionality — Puter had no easy per-resume delete in your app
// ─────────────────────────────────────────────────────────────
export async function deleteResume(resumeId: string): Promise<void> {
    const resumeRef = doc(collection(db, 'resumes'), resumeId);

    // deleteDoc() permanently removes the document
    // There is NO recycle bin, NO undo — it's gone immediately
    // This only deletes the Firestore document (the metadata)
    // The actual PDF and image files in Firebase Storage are NOT deleted here
    // Those are deleted separately via deleteUserFiles() in storage.ts
    await deleteDoc(resumeRef);
}

// ─────────────────────────────────────────────────────────────
// DELETE ALL RESUMES FOR A USER
// Replaces: await kv.flush() in wipe.tsx
// ─────────────────────────────────────────────────────────────
export async function deleteAllUserResumes(userId: string): Promise<void> {
    // Get all resumes for this user first
    const resumes = await getUserResumes(userId);

    // Delete all documents in parallel
    // Each deleteDoc() is an independent network call — no reason to
    // wait for one before starting the next, so Promise.all() wins here
    await Promise.all(
        resumes.map((resume) =>
            deleteDoc(doc(collection(db, 'resumes'), resume.id))
        )
    );
}