// app/lib/pdfExtract.ts
// Extracts raw text from a PDF file using pdfjs-dist
// We already have pdfjs-dist installed for pdf2img.ts — we reuse the same library
// but call a completely different API on it (text extraction vs canvas rendering)

// We reuse the same singleton loader pattern from pdf2img.ts
// WHY SINGLETON: pdfjs-dist is a large library (~3MB). If we imported it fresh
// every time extractTextFromPdf() was called, the browser would parse and
// initialize the entire library on each call. By caching the loaded lib in
// a module-level variable, the expensive initialization happens exactly once
// per page session, and subsequent calls get the cached version instantly.
let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    // If already loaded, return immediately — zero cost
    if (pdfjsLib) return pdfjsLib;

    // If a load is already IN PROGRESS (another call started it),
    // return the same promise instead of starting a second load.
    // Without this guard, two simultaneous calls would both try to
    // import the library, causing a race condition where both think
    // they're initializing it for the first time.
    if (loadPromise) return loadPromise;

    loadPromise = import('pdfjs-dist/build/pdf.mjs').then((lib) => {
        // The worker runs in a separate browser thread (Web Worker)
        // It handles the actual PDF parsing — computationally expensive work
        // that would freeze the UI if run on the main thread.
        // We point it to the CDN so we don't have to copy the worker file
        // into our public/ folder manually during builds.
        lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs';
        pdfjsLib = lib;
        return lib;
    });

    return loadPromise;
}

export async function extractTextFromPdf(file: File): Promise<string> {
    const lib = await loadPdfJs();

    // File.arrayBuffer() reads the entire file into memory as a raw binary buffer
    // pdfjs needs the raw bytes — it can't work with the File object directly
    // because File is a browser abstraction, not raw binary data
    const arrayBuffer = await file.arrayBuffer();

    // getDocument() is pdfjs's entry point for loading a PDF
    // The { data: arrayBuffer } form loads from memory (vs { url: '...' } for network)
    // .promise is appended because pdfjs uses its own Promise wrapper internally
    // called PDFDocumentLoadingTask — it's not a native Promise but has .promise on it
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

    // pdf.numPages tells us how many pages exist so we can loop through all of them
    // A resume is typically 1-2 pages but we handle any number
    // WHY EXTRACT ALL PAGES: The AI needs the full resume content.
    // If we only extracted page 1, a 2-page resume would get incomplete analysis.
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // Pages are 1-indexed in pdfjs (not 0-indexed like arrays)
        // This is because PDF spec itself numbers pages starting from 1
        const page = await pdf.getPage(pageNum);

        // getTextContent() extracts the text layer of the PDF
        // PDFs store text as positioned text chunks — each with x,y coordinates,
        // font info, and the actual string. This is separate from the visual
        // rendering (which is what pdf2img.ts uses via canvas)
        const textContent = await page.getTextContent();

        // textContent.items is an array of TextItem objects
        // Each TextItem has:
        //   .str        → the actual text string for this chunk
        //   .transform  → [scaleX, skewX, skewY, scaleY, x, y] position matrix
        //   .width      → width of the text chunk in PDF units
        //   .height     → height
        //   .dir        → text direction ('ltr' or 'rtl')
        //
        // We only care about .str — the actual text content
        // We filter out empty strings first because pdfjs sometimes returns
        // whitespace-only items for spacing between text blocks
        const pageText = textContent.items
            .map((item: any) => item.str)
            .filter((str: string) => str.trim().length > 0)
            .join(' ');

        // Add a newline between pages so the AI understands page boundaries
        // Without this, content from different pages would run together
        // which could confuse section detection in the resume
        fullText += pageText + '\n';
    }

    const trimmed = fullText.trim();

    // A PDF with no extractable text is likely a scanned image PDF
    // (photographed or scanned resume saved as PDF without OCR)
    // pdfjs can render scanned PDFs visually but cannot extract text from images
    // In this case we warn clearly rather than sending empty text to Gemini
    // (empty text would cause Gemini to return a meaningless analysis)
    if (!trimmed) {
        throw new Error(
            'No text could be extracted from this PDF. ' +
            'If this is a scanned resume, please use a PDF with selectable text.'
        );
    }

    return trimmed;
}