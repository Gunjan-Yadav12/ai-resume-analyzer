// types/pdfjs.d.ts
// Manual type declaration for the pdfjs-dist .mjs build path.
//
// WHY THIS IS NEEDED:
// pdfjs-dist ships TypeScript types at its package root (index.d.ts)
// which covers import 'pdfjs-dist' but NOT import 'pdfjs-dist/build/pdf.mjs'
// TypeScript treats these as completely different module paths.
// When TypeScript can't find types for a module path, it throws TS7016.
//
// The fix is a "module declaration" — we tell TypeScript:
// "this module path exists, and it exports 'any' type"
// It's not perfectly typed but it silences the error and lets
// our existing runtime code (which works correctly) compile cleanly.
//
// A more complete solution would be to write out the full types
// for every pdfjs function we use, but 'any' is acceptable here
// because pdf2img.ts already uses 'any' for pdfjsLib — we're
// just making that explicit at the module declaration level too.
declare module 'pdfjs-dist/build/pdf.mjs';