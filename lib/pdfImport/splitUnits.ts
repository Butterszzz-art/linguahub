// lib/pdfImport/splitUnits.ts
//
// Heuristically splits a course PDF's raw extracted text into per-unit
// chunks, by finding heading lines like "UNIT 3" or "Lesson 12". This is
// deliberately just the mechanical split — it does NOT try to understand
// or clean up the content, so callers should show detected units to the
// person for review/selection before spending an AI call on each one (a
// bad split is cheap to notice here, expensive to notice after restructuring).

export type DetectedUnit = {
  /** Unit/lesson number as it appeared in the source, e.g. 3 for "UNIT 3". */
  number: number;
  /** Whatever trailing text was on the same line as the heading, if any. */
  headingText: string;
  /** Everything between this heading and the next one. */
  rawText: string;
};

// Tried in order; first pattern that yields 2+ matches in the document wins.
// Every FSI-style course text seen so far uses one of these — "UNIT N",
// "LESSON N", or occasionally "Unidad N" for some Spanish-language variants.
const HEADING_PATTERNS = [
  /^\s*UNIT\s+(\d{1,3})\b[.:]?\s*(.*)$/im,
  /^\s*LESSON\s+(\d{1,3})\b[.:]?\s*(.*)$/im,
  /^\s*UNIDAD\s+(\d{1,3})\b[.:]?\s*(.*)$/im,
  /^\s*CHAPTER\s+(\d{1,3})\b[.:]?\s*(.*)$/im,
];

export function splitIntoUnits(rawText: string): DetectedUnit[] {
  const lines = rawText.split("\n");

  for (const pattern of HEADING_PATTERNS) {
    // Build a global version of whichever single-match pattern this is, so
    // we can find every occurrence's line index.
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");

    const matches: { lineIndex: number; number: number; headingText: string }[] = [];
    lines.forEach((line, i) => {
      globalPattern.lastIndex = 0;
      const m = globalPattern.exec(line);
      if (m) {
        matches.push({ lineIndex: i, number: Number(m[1]), headingText: m[2]?.trim() ?? "" });
      }
    });

    if (matches.length < 2) continue; // not enough hits — try the next pattern

    const units: DetectedUnit[] = matches.map((match, i) => {
      const start = match.lineIndex + 1;
      const end = i + 1 < matches.length ? matches[i + 1].lineIndex : lines.length;
      return {
        number: match.number,
        headingText: match.headingText,
        rawText: lines.slice(start, end).join("\n").trim(),
      };
    });

    // Guard against a false-positive pattern match (e.g. a table of contents
    // that also lists "UNIT 1", "UNIT 2" ... before the real content) by
    // dropping units that are implausibly short to be real lesson content.
    const substantial = units.filter((u) => u.rawText.length > 200);
    if (substantial.length >= 2) return substantial;
  }

  // No pattern produced a plausible split — return the whole document as a
  // single "unit" so the caller can still show *something* rather than fail
  // outright; the person reviewing the preview will see this immediately
  // (one giant chunk) and know the automated split didn't work this time.
  return [{ number: 1, headingText: "", rawText: rawText.trim() }];
}
