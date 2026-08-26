// Local, offline document reading: Tesseract.js OCRs images (and scanned PDF
// pages) entirely in the browser; pdf.js pulls the text layer out of normal
// (non-scanned) PDFs directly. No network call, no API key.

function linesToIndexItems(rawText) {
    return rawText
        .split('\n')
        .map(line => line
            .replace(/^\s*[•\-–—*]\s*/, '')      // bullet markers
            .replace(/^\s*\(?\d+[\.\)]\s*/, '')        // "1.", "1)", "(1)"
            .replace(/[.\-–—\s]{3,}\d+\s*$/, '')       // dot leaders + trailing page number
            .replace(/\s{2,}\d+\s*$/, '')               // trailing page number after big gap
            .trim())
        .filter(line => line.length > 1);
}

async function ocrImage(file, onProgress) {
    const { data } = await Tesseract.recognize(file, 'eng', {
        logger: msg => {
            if (msg.status === 'recognizing text' && onProgress) {
                onProgress(Math.round((msg.progress || 0) * 100));
            }
        }
    });
    return data.text;
}

async function renderPdfPageToCanvas(page) {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas;
}

async function extractFromPdf(file, onProgress) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
    }

    if (text.trim().length >= 20) return text;

    // No usable text layer — this is likely a scanned PDF. Fall back to
    // rendering each page as an image and running OCR on it.
    text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) onProgress(Math.round(((i - 1) / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        const canvas = await renderPdfPageToCanvas(page);
        const { data } = await Tesseract.recognize(canvas, 'eng');
        text += data.text + '\n';
    }
    return text;
}

/**
 * Reads an index/table-of-contents from an image or PDF entirely locally
 * and returns an ordered array of cleaned-up item titles.
 */
export async function extractIndexItemsFromFile(file, onProgress) {
    const isPdf = file.type === 'application/pdf';
    const rawText = isPdf ? await extractFromPdf(file, onProgress) : await ocrImage(file, onProgress);
    return linesToIndexItems(rawText);
}
