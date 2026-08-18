// scripts/generate-german-content.ts
//
// One-off/reproducible build step: parses the plain-text German curriculum in
// content-source/german/*.txt into self-contained per-lesson HTML files under
// content/german/, plus manifest-german.json describing the classroom/unit/
// lesson structure for prisma/seed-german.ts.
//
// The German source uses a simpler structural convention than Italian/French/
// Turkish (see german_00_index.txt): "####" brackets each PART, "====" divides
// each LESSON, and section labels (OVERVIEW, GRAMMAR, CONJUGATION TABLE,
// VOCABULARY, EXAMPLES, NOTES, PRACTICE) sit bare on their own line with no
// trailing colon. Text is not hard-wrapped — every logical line is one
// physical line — so unlike generate-turkish-content.ts there's no
// indentation-based continuation-line joining to do.
//
// Two format differences drove custom rendering here:
//   - GRAMMAR (and occasionally CONJUGATION TABLE) sections freely mix prose
//     paragraphs, "- " bullet lists, "N. " numbered lists, and Markdown-style
//     "| a | b |" pipe tables in any order. renderRichText() is a single
//     generic block parser that walks the section line-by-line and handles
//     all four block kinds, reused for OVERVIEW/GRAMMAR/CONJUGATION
//     TABLE/NOTES/PRACTICE alike.
//   - VOCABULARY and EXAMPLES lines are "- " prefixed and use an em dash
//     (" — ") as the word/translation separator (Italian/Turkish use a plain
//     hyphen with no leading dash). EXAMPLES usually has no phonetic
//     pronunciation at all; when a trailing "(...)" does look phonetic
//     (rather than a grammar-case annotation like "(dative)"), it's split
//     out the same way VOCABULARY's pronunciation parenthetical is.
//
// Run with: npx tsx scripts/generate-german-content.ts

import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "content-source", "german");
const OUT_DIR = path.join(process.cwd(), "content", "german");
const MANIFEST_PATH = path.join(process.cwd(), "manifest-german.json");

const SOURCE_FILES = ["german_01_foundations.txt", "german_02_verbs_present.txt", "german_03_cases.txt"];

const SECTION_LABELS = [
  "OVERVIEW",
  "GRAMMAR",
  "CONJUGATION TABLE",
  "VOCABULARY",
  "EXAMPLES",
  "NOTES",
  "PRACTICE",
] as const;
type SectionLabel = (typeof SECTION_LABELS)[number];

type Lesson = { num: number; title: string; sections: Partial<Record<SectionLabel, string>> };
type Part = { num: number; title: string; lessons: Lesson[] };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Title-cases only the fully-UPPERCASE words in a string (e.g. "FOUNDATIONS —
// Sounds, Structure, and First Words" -> "Foundations — Sounds, Structure,
// and First Words"), leaving already mixed-case words (and punctuation-only
// tokens like "—") untouched.
function normalizeShoutedWords(s: string): string {
  return s
    .split(" ")
    .map((word) => {
      const letters = word.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
      if (letters.length > 1 && letters === letters.toUpperCase()) {
        return word.replace(/[A-Za-z]+/, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
      }
      return word;
    })
    .join(" ");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".,?!]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// --- Parsing -----------------------------------------------------------

function parsePart(fileText: string): Part {
  const text = fileText.trim().replace(/^####\s*/, "").replace(/####\s*$/, "").trim();

  const partMatch = text.match(/^PART (\d+):\s*(.+)$/m);
  if (!partMatch) throw new Error("Could not find PART header");
  const partNum = Number(partMatch[1]);
  const partTitle = normalizeShoutedWords(partMatch[2].trim());

  const afterHeader = text.slice((partMatch.index ?? 0) + partMatch[0].length);

  // Split on lesson dividers ("===="), one per lesson boundary — unlike
  // Turkish's format, a German lesson's "LESSON N: Title" header isn't
  // wrapped in its own divider, it's just the first line of the segment
  // that follows the preceding divider.
  const segments = afterHeader
    .split(/\n?={4,}\n?/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lessons: Lesson[] = [];
  for (const segment of segments) {
    const headerMatch = segment.match(/^LESSON (\d+):\s*(.+)$/m);
    if (!headerMatch) continue;
    const num = Number(headerMatch[1]);
    const title = headerMatch[2].trim();
    const body = segment.slice((headerMatch.index ?? 0) + headerMatch[0].length).trim();
    lessons.push({ num, title, sections: parseSections(body) });
  }

  return { num: partNum, title: partTitle, lessons };
}

function parseSections(body: string): Partial<Record<SectionLabel, string>> {
  const labelAlt = SECTION_LABELS.join("|");
  const re = new RegExp(`^(${labelAlt})$`, "m");
  const pieces = body.split(re);
  // pieces = [ before(usually empty), LABEL, text, LABEL, text, ... ]
  const sections: Partial<Record<SectionLabel, string>> = {};
  for (let i = 1; i < pieces.length; i += 2) {
    const label = pieces[i].trim() as SectionLabel;
    const text = (pieces[i + 1] ?? "").trim();
    sections[label] = text;
  }
  return sections;
}

// --- Rendering: generic rich-text blocks --------------------------------
//
// Handles OVERVIEW, GRAMMAR, CONJUGATION TABLE, NOTES, and PRACTICE, all of
// which are some mixture of prose paragraphs, "- " bullets, "N. " numbered
// items, and "| a | b |" pipe tables. Every logical line is exactly one
// physical line in the source, so no continuation-joining is needed.

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] };

function classifyLine(line: string): "table" | "bullet" | "numbered" | "text" {
  const t = line.trim();
  if (/^\|.*\|$/.test(t)) return "table";
  if (/^-\s+/.test(t)) return "bullet";
  if (/^\d+\.\s+/.test(t)) return "numbered";
  return "text";
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function parseRichText(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }
    const kind = classifyLine(lines[i]);
    if (kind === "table") {
      const rows: string[][] = [];
      while (i < lines.length && classifyLine(lines[i]) === "table") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      const header = rows[0] ?? [];
      const body = isSeparatorRow(rows[1] ?? []) ? rows.slice(2) : rows.slice(1);
      blocks.push({ type: "table", header, rows: body });
    } else if (kind === "bullet") {
      const items: string[] = [];
      while (i < lines.length && classifyLine(lines[i]) === "bullet") {
        items.push(lines[i].trim().replace(/^-\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
    } else if (kind === "numbered") {
      const items: string[] = [];
      while (i < lines.length && classifyLine(lines[i]) === "numbered") {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
    } else {
      const pLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && classifyLine(lines[i]) === "text") {
        pLines.push(lines[i].trim());
        i++;
      }
      blocks.push({ type: "p", lines: pLines });
    }
  }
  return blocks;
}

function renderRichText(text: string): string {
  return parseRichText(text)
    .map((block) => {
      if (block.type === "p") return `<p>${escapeHtml(block.lines.join(" "))}</p>`;
      if (block.type === "ul") {
        return `<ul>\n${block.items.map((it) => `<li>${escapeHtml(it)}</li>`).join("\n")}\n</ul>`;
      }
      if (block.type === "ol") {
        return `<ol>\n${block.items.map((it) => `<li>${escapeHtml(it)}</li>`).join("\n")}\n</ol>`;
      }
      const head = `<tr>${block.header.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
      const body = block.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
        .join("\n");
      return `<div class="table-wrap"><table><thead>${head}</thead><tbody>\n${body}\n</tbody></table></div>`;
    })
    .join("\n");
}

// --- Rendering: VOCABULARY & EXAMPLES -----------------------------------
//
// Both are "- " prefixed, one entry per line, using " — " (em dash) as the
// separator. VOCABULARY is always "word (pronunciation) — meaning"; EXAMPLES
// is usually "German sentence — English translation" with no pronunciation,
// though a few lines do include one as a trailing parenthetical before the
// dash. Trailing parens that are really a grammar-case annotation (e.g.
// "(dative)") are left alone rather than mistaken for pronunciation.

function renderVocab(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = lines.map((raw) => {
    const item = raw.replace(/^-\s+/, "");
    const withPron = item.match(/^(.+?)\s\(([^)]+)\)\s—\s(.+)$/);
    if (withPron) {
      const [, word, pron, meaning] = withPron;
      return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(word.trim())}</div><div class="vocab-pron">${escapeHtml(pron.trim())}</div><div class="vocab-meaning">${escapeHtml(meaning.trim())}</div></div>`;
    }
    const wordOnly = item.match(/^(.+?)\s—\s(.+)$/);
    if (wordOnly) {
      const [, word, meaning] = wordOnly;
      return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(word.trim())}</div><div></div><div class="vocab-meaning">${escapeHtml(meaning.trim())}</div></div>`;
    }
    return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(item)}</div><div></div><div></div></div>`;
  });

  return `<div class="vocab-grid">\n${rows.join("\n")}\n</div>`;
}

const CASE_ANNOTATIONS = /^(nominative|accusative|dative|genitive|formal|informal|singular|plural)$/i;

function renderExamples(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks = lines.map((raw) => {
    const item = raw.replace(/^-\s+/, "");
    const idx = item.indexOf(" — ");
    if (idx === -1) {
      return `<div class="example"><p class="de">${escapeHtml(item)}</p></div>`;
    }
    let de = item.slice(0, idx).trim();
    const en = item.slice(idx + 3).trim();
    let pron = "";
    const trailingParen = de.match(/^(.+?)\s\(([^()]+)\)$/);
    if (trailingParen && !CASE_ANNOTATIONS.test(trailingParen[2].trim())) {
      de = trailingParen[1].trim();
      pron = trailingParen[2].trim();
    }
    return `<div class="example"><p class="de">${escapeHtml(de)}</p>${pron ? `<span class="pron">${escapeHtml(pron)}</span>` : ""}<p class="en">${escapeHtml(en)}</p></div>`;
  });

  return blocks.join("\n");
}

function renderLesson(part: Part, lesson: Lesson): string {
  const s = lesson.sections;
  const body = `
${s.OVERVIEW ? `<section class="overview">${renderRichText(s.OVERVIEW)}</section>` : ""}
${s.GRAMMAR ? `<section><h2>Grammar</h2>${renderRichText(s.GRAMMAR)}</section>` : ""}
${s["CONJUGATION TABLE"] ? `<section class="table"><h2>Reference Table</h2>${renderRichText(s["CONJUGATION TABLE"])}</section>` : ""}
${s.VOCABULARY ? `<section><h2>Vocabulary</h2>${renderVocab(s.VOCABULARY)}</section>` : ""}
${s.EXAMPLES ? `<section><h2>Examples</h2>${renderExamples(s.EXAMPLES)}</section>` : ""}
${s.NOTES ? `<section><h2>Notes</h2>${renderRichText(s.NOTES)}</section>` : ""}
${s.PRACTICE ? `<section class="practice"><h2>Practice</h2>${renderRichText(s.PRACTICE)}</section>` : ""}
`.trim();

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(lesson.title)}</title>
<style>
  :root{
    --cream:#f7f9fb; --beige:#e4eaf0; --beige-dark:#b9c6d6;
    --ink:#22303f; --ink-muted:#5f7385;
    --steel:#3d6f96; --steel-dark:#2c5678; --steel-light:#cfdfec;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --cream:#141c24; --beige:#1c2833; --beige-dark:#2f4356;
      --ink:#dce6ee; --ink-muted:#93a7b8;
      --steel:#6fa8d1; --steel-dark:#8cbde0; --steel-light:#243a4a;
    }
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--cream); color:var(--ink);
    font-family:-apple-system,"Segoe UI",Roboto,sans-serif; line-height:1.6;
    padding:2rem clamp(1rem,4vw,3rem) 3rem;
  }
  .kicker{
    color:var(--steel-dark); font-weight:700; letter-spacing:.04em;
    text-transform:uppercase; font-size:.75rem; margin:0 0 .35rem;
  }
  h1{font-size:1.5rem; margin:0 0 1.5rem;}
  section{
    background:var(--beige); border-radius:1rem;
    padding:1.1rem 1.4rem; margin-bottom:1.1rem;
  }
  section h2{
    margin:0 0 .7rem; font-size:.85rem; text-transform:uppercase;
    letter-spacing:.04em; color:var(--steel-dark);
  }
  section.overview{background:transparent; padding:0 0 .25rem; font-size:1.05rem;}
  section.practice{background:var(--steel-light);}
  ul,ol{margin:.25rem 0; padding-left:1.2rem;}
  li{margin-bottom:.6rem;}
  p{margin:.5rem 0;}
  .vocab-grid{display:grid; grid-template-columns:auto auto 1fr; gap:.4rem 1.1rem; align-items:baseline;}
  .vocab-word{font-weight:700;}
  .vocab-pron{color:var(--ink-muted); font-style:italic; font-size:.9rem; white-space:nowrap;}
  .vocab-meaning{color:var(--ink);}
  .example{margin-bottom:.9rem; padding-bottom:.9rem; border-bottom:1px solid var(--beige-dark);}
  .example:last-child{border-bottom:none; margin-bottom:0; padding-bottom:0;}
  .example .de{font-weight:600; margin:0;}
  .example .pron{color:var(--ink-muted); font-style:italic; display:block; font-size:.9rem; margin:.15rem 0;}
  .example .en{color:var(--ink); margin:.15rem 0 0;}
  .table-wrap{overflow-x:auto; margin:.6rem 0;}
  table{border-collapse:collapse; width:100%; font-size:.88rem;}
  th,td{padding:.35rem .65rem; border:1px solid var(--beige-dark); text-align:left; white-space:nowrap;}
  thead th{background:var(--beige-dark); color:var(--ink);}
</style>
</head>
<body>
  <p class="kicker">Part ${part.num} · ${escapeHtml(part.title)} · Lesson ${lesson.num}</p>
  <h1>${escapeHtml(lesson.title)}</h1>
  ${body}
</body>
</html>
`;
}

// --- Main -----------------------------------------------------------

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const parts: Part[] = SOURCE_FILES.map((f) => parsePart(fs.readFileSync(path.join(SRC_DIR, f), "utf-8")));

  const manifestUnits = parts.map((part) => ({
    title: `Part ${part.num}: ${part.title}`,
    order: part.num - 1,
    lessons: part.lessons.map((lesson) => {
      const fileName = `${String(lesson.num).padStart(2, "0")}-${slugify(lesson.title)}.html`;
      const outPath = path.join(OUT_DIR, fileName);
      fs.writeFileSync(outPath, renderLesson(part, lesson));
      return {
        order: lesson.num - 1,
        title: `Lesson ${lesson.num}: ${lesson.title}`,
        file: `content/german/${fileName}`,
      };
    }),
  }));

  const manifest = {
    classroom: { language: "German", level: "Beginner–Intermediate" },
    units: manifestUnits,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  const totalLessons = parts.reduce((n, p) => n + p.lessons.length, 0);
  console.log(`Generated ${totalLessons} lessons across ${parts.length} parts into ${OUT_DIR}`);
  console.log(`Wrote ${MANIFEST_PATH}`);
}

main();
