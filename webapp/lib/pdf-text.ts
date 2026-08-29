/** Extracts plain text from a PDF buffer, for side-by-side manual comparison
 * against a quotation — no OCR/AI, just whatever text layer the PDF has.
 *
 * `pdf-parse` (via pdfjs-dist) is dynamically imported here rather than at
 * module top level: it's marked as a serverExternalPackages entry, and a
 * static top-level import made it load eagerly as soon as *anything* that
 * transitively imports this file gets bundled — which, via
 * app/quotations/actions.ts, was every quotation Server Action, including
 * ones with nothing to do with PDFs. That eager load crashed with
 * `ReferenceError: DOMMatrix is not defined` (pdfjs-dist expects a
 * browser-ish Canvas global that doesn't exist in the Vercel Node runtime),
 * taking down actions like flagging a quotation or signing out. A dynamic
 * import defers loading the package to the moment a PDF is actually
 * uploaded, so it can never contaminate an unrelated action again.
 */
export async function extractPdfText(data: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
