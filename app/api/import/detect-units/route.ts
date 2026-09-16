import { extractPdfText } from "@/lib/pdfImport/extractPdfText";
import { splitIntoUnits } from "@/lib/pdfImport/splitUnits";

const PREVIEW_CHARS = 220;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pdfUrl } = (body ?? {}) as { pdfUrl?: unknown };
  if (typeof pdfUrl !== "string" || pdfUrl.trim().length === 0) {
    return Response.json({ error: "pdfUrl is required" }, { status: 400 });
  }

  let rawText: string;
  try {
    rawText = await extractPdfText(pdfUrl.trim());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: detail }, { status: 502 });
  }

  const units = splitIntoUnits(rawText);

  // Nothing is saved or sent to the restructuring API here — this is purely
  // "here's what the mechanical split found, does this look right?" so a bad
  // split is cheap to notice before any AI calls are made.
  return Response.json({
    unitsFound: units.length,
    units: units.map((u) => ({
      number: u.number,
      headingText: u.headingText,
      preview: u.rawText.slice(0, PREVIEW_CHARS).replace(/\s+/g, " ").trim(),
      charCount: u.rawText.length,
    })),
  });
}
