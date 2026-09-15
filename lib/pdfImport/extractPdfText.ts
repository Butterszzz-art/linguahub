// lib/pdfImport/extractPdfText.ts
//
// Fetches a PDF from a URL and pulls its raw text out. This is the mechanical
// half of the import pipeline — no restructuring or judgment calls, just
// "get me the text that's actually in this file." Works for text-layer PDFs
// (including OCR'd ones); scanned images with no text layer will come back
// empty, which callers should treat as a clear "this source needs OCR first"
// error rather than silently importing nothing.

import { fetchPdfBuffer } from "./fetchPdfBuffer";

export async function extractPdfText(pdfUrl: string): Promise<string> {
  const buffer = await fetchPdfBuffer(pdfUrl);

  // pdf-parse v2's API is a PDFParse class, not the v1 default-export
  // function — construct it with the raw bytes and pull the concatenated
  // document text back out.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  let text: string;
  try {
    text = (await parser.getText()).text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }

  if (text.length === 0) {
    throw new Error(
      "This PDF has no extractable text — it's likely a scanned image with no text layer, and would need OCR before it can be imported this way."
    );
  }
  return text;
}
