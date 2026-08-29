import { PDFParse } from "pdf-parse";

/** Extracts plain text from a PDF buffer, for side-by-side manual comparison
 * against a quotation — no OCR/AI, just whatever text layer the PDF has. */
export async function extractPdfText(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
