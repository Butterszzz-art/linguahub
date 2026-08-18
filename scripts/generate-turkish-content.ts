// scripts/generate-turkish-content.ts
//
// One-off/reproducible build step: parses the plain-text Turkish curriculum in
// content-source/turkish/*.txt (same "####"/"===="/"ALL-CAPS LABEL:" structure
// as the Italian/French courses — see turkish_00_curriculum_index.txt) into
// self-contained per-lesson HTML files under content/turkish/, plus
// manifest-turkish.json describing the classroom/unit/lesson structure for
// prisma/seed-turkish.ts.
//
// Differs from generate-italian-content.ts in two ways the source text itself
// differs:
//   - VOCABULARY in Lesson 3 groups entries under bare "Category:" sub-headers
//     (Basics:, Talking:, Shopping:, ...) with no dash or parenthesis of their
//     own — these are rendered as a heading row spanning the vocab grid
//     rather than a word/pronunciation/meaning entry.
//   - PRACTICE is always a numbered list ("1. ... 2. ..." with wrapped
//     continuation lines indented), not free prose paragraphs, so it's
//     rendered as an <ol> instead of reusing renderParagraphs.
// Otherwise identical to Italian: VOCABULARY and EXAMPLES both use a single
// "word/sentence (phonetic) - meaning" line format, and PART/LESSON headers
// are always single physical lines.
//
// Run with: npx tsx scripts/generate-turkish-content.ts

import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "content-source", "turkish");
const OUT_DIR = path.join(process.cwd(), "content", "turkish");
const MANIFEST_PATH = path.join(process.cwd(), "manifest-turkish.json");

const SOURCE_FILES = [
  "turkish_01_foundations.txt",
  "turkish_02_first_encounters.txt",
  "turkish_03_past_future.txt",
  "turkish_04_needs_conditions.txt",
  "turkish_05_narrative_turkish.txt",
];

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

const SMALL_WORDS = new Set(["and", "of", "the", "a", "an", "to", "in"]);
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
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
  const partMatch = fileText.match(/^PART (\d+) — (.+?)\s*\(Lessons/m);
  if (!partMatch) throw new Error("Could not find PART header");
  const partNum = Number(partMatch[1]);
  const partTitle = titleCase(partMatch[2].trim());

  // Split on lesson dividers ("====...=="), which brackets each
  // "LESSON N: Title" line. Segments alternate: [preamble, header, body, header, body, ...]
  const segments = fileText
    .split(/\n?={10,}\n?/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lessons: Lesson[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const headerMatch = segments[i].match(/^LESSON (\d+):\s*(.+)$/);
    if (!headerMatch) continue;
    const num = Number(headerMatch[1]);
    const title = headerMatch[2].trim();
    const body = segments[i + 1];
    lessons.push({ num, title, sections: parseSections(body) });
  }

  return { num: partNum, title: partTitle, lessons };
}

function parseSections(body: string): Partial<Record<SectionLabel, string>> {
  const labelAlt = SECTION_LABELS.join("|");
  const re = new RegExp(`^(${labelAlt}):$`, "m");
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

// --- Rendering -----------------------------------------------------------

// Dash-bulleted lists (GRAMMAR, NOTES): a new item starts at an unindented
// "- " line. Within an item, lines indented 1-3 spaces are ordinary wrapped
// continuations (joined onto the last line with a space). Lines indented 4+
// spaces are a nested sub-item (e.g. a mini reference list inside the
// bullet) and get their own line — unless indented even deeper than the
// current sub-item's own indent, in which case they're a wrapped
// continuation of *that* sub-item.
function renderBullets(text: string): string {
  type Node = { type: "p" | "li"; lines: string[]; deepLevel: number | null };
  const nodes: Node[] = [];
  let current: Node | null = null;

  for (const rawLine of text.split("\n")) {
    if (rawLine.trim() === "") {
      current = null;
      continue;
    }
    const indent = rawLine.match(/^ */)![0].length;
    const trimmed = rawLine.trim();
    const isBulletStart = indent === 0 && /^- /.test(trimmed);

    if (isBulletStart) {
      current = { type: "li", lines: [escapeHtml(trimmed.slice(2))], deepLevel: null };
      nodes.push(current);
    } else if (!current) {
      current = { type: "p", lines: [escapeHtml(trimmed)], deepLevel: null };
      nodes.push(current);
    } else if (indent >= 4) {
      if (current.deepLevel === null || indent <= current.deepLevel) {
        current.lines.push(escapeHtml(trimmed));
        current.deepLevel = indent;
      } else {
        current.lines[current.lines.length - 1] += " " + escapeHtml(trimmed);
      }
    } else {
      current.lines[current.lines.length - 1] += " " + escapeHtml(trimmed);
    }
  }

  let html = "";
  let i = 0;
  while (i < nodes.length) {
    if (nodes[i].type === "p") {
      html += `<p>${nodes[i].lines.join("<br>")}</p>\n`;
      i++;
    } else {
      html += "<ul>\n";
      while (i < nodes.length && nodes[i].type === "li") {
        html += `<li>${nodes[i].lines.join("<br>")}</li>\n`;
        i++;
      }
      html += "</ul>\n";
    }
  }
  return html;
}

// Plain prose (OVERVIEW, NOTES): blank-line-separated paragraphs, each with
// wrapped lines rejoined with a space.
function renderParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.split("\n").map((l) => l.trim()).join(" ").trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join("\n");
}

// PRACTICE: always a numbered list ("1. ..." at indent 0; wrapped
// continuation lines are indented and get rejoined with a space).
function renderPractice(text: string): string {
  const items: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    const indent = raw.match(/^ */)![0].length;
    const trimmed = raw.trim();
    if (indent === 0 && /^\d+\.\s/.test(trimmed)) {
      items.push(trimmed.replace(/^\d+\.\s*/, ""));
    } else if (items.length > 0) {
      items[items.length - 1] += " " + trimmed;
    }
  }
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  return `<ol>\n${lis}\n</ol>`;
}

// VOCABULARY: one entry per logical line, "word (pronunciation) - meaning".
// A bare "Category:" line (no dash, no parenthesis) is a sub-heading —
// Lesson 3's phrasebook groups (Basics:, Shopping:, Directions:, ...).
function renderVocab(text: string): string {
  type Entry = { kind: "category"; label: string } | { kind: "word"; text: string };
  const entries: Entry[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    const indent = raw.match(/^ */)![0].length;
    const trimmed = raw.trim();
    if (indent === 0 && /^[A-Za-z][A-Za-z ]*:$/.test(trimmed)) {
      entries.push({ kind: "category", label: trimmed.slice(0, -1) });
      continue;
    }
    if (indent > 0 && entries.length > 0 && entries[entries.length - 1].kind === "word") {
      (entries[entries.length - 1] as { kind: "word"; text: string }).text += " " + trimmed;
      continue;
    }
    entries.push({ kind: "word", text: trimmed });
  }

  const rows = entries.map((entry) => {
    if (entry.kind === "category") {
      return `<div class="vocab-category">${escapeHtml(entry.label)}</div>`;
    }
    const m = entry.text.match(/^(.+?)\s\(([^)]+)\)\s*-\s*(.+)$/);
    if (!m) {
      return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(entry.text)}</div><div></div><div></div></div>`;
    }
    const [, word, pron, meaning] = m;
    return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(word.trim())}</div><div class="vocab-pron">${escapeHtml(pron.trim())}</div><div class="vocab-meaning">${escapeHtml(meaning.trim())}</div></div>`;
  });

  return `<div class="vocab-grid">\n${rows.join("\n")}\n</div>`;
}

// EXAMPLES: one entry per logical line (wrapped continuations indented),
// "Turkish sentence (phonetic) - English translation".
function renderExamples(text: string): string {
  const lines = text.split("\n");
  const entries: string[] = [];
  for (const raw of lines) {
    if (raw.trim() === "") continue;
    const indent = raw.match(/^ */)![0].length;
    const trimmed = raw.trim();
    if (indent > 0 && entries.length > 0) {
      entries[entries.length - 1] += " " + trimmed;
      continue;
    }
    entries.push(trimmed);
  }

  const blocks = entries.map((entry) => {
    const m = entry.match(/^(.+?)\s\(([^)]+)\)\s*-\s*(.+)$/);
    if (!m) {
      return `<div class="example"><p class="tr">${escapeHtml(entry)}</p></div>`;
    }
    const [, tr, pron, en] = m;
    return `<div class="example"><p class="tr">${escapeHtml(tr.trim())}</p><span class="pron">${escapeHtml(pron.trim())}</span><p class="en">${escapeHtml(en.trim())}</p></div>`;
  });

  return blocks.join("\n");
}

// CONJUGATION TABLE: whitespace-aligned reference table — preserved verbatim
// in a monospace block rather than reverse-engineered into <table> cells.
function renderTable(text: string): string {
  return `<pre>${escapeHtml(text)}</pre>`;
}

function renderLesson(part: Part, lesson: Lesson): string {
  const s = lesson.sections;
  const body = `
${s.OVERVIEW ? `<section class="overview">${renderParagraphs(s.OVERVIEW)}</section>` : ""}
${s.GRAMMAR ? `<section><h2>Grammar</h2>${renderBullets(s.GRAMMAR)}</section>` : ""}
${s["CONJUGATION TABLE"] ? `<section class="table"><h2>Reference Table</h2>${renderTable(s["CONJUGATION TABLE"])}</section>` : ""}
${s.VOCABULARY ? `<section><h2>Vocabulary</h2>${renderVocab(s.VOCABULARY)}</section>` : ""}
${s.EXAMPLES ? `<section><h2>Examples</h2>${renderExamples(s.EXAMPLES)}</section>` : ""}
${s.NOTES ? `<section><h2>Notes</h2>${renderParagraphs(s.NOTES)}</section>` : ""}
${s.PRACTICE ? `<section class="practice"><h2>Practice</h2>${renderPractice(s.PRACTICE)}</section>` : ""}
`.trim();

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(lesson.title)}</title>
<style>
  :root{
    --cream:#fdf9f2; --beige:#f3e7d6; --beige-dark:#d9bd97;
    --ink:#3a2c21; --ink-muted:#8a7663;
    --caramel:#c1483f; --caramel-dark:#a1332f; --caramel-light:#f0c8b8;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --cream:#241512; --beige:#33201b; --beige-dark:#4f2f2b;
      --ink:#f3e0d6; --ink-muted:#c7a39a;
      --caramel:#e08a53; --caramel-dark:#e89778; --caramel-light:#4a2e22;
    }
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--cream); color:var(--ink);
    font-family:-apple-system,"Segoe UI",Roboto,sans-serif; line-height:1.6;
    padding:2rem clamp(1rem,4vw,3rem) 3rem;
  }
  .kicker{
    color:var(--caramel-dark); font-weight:700; letter-spacing:.04em;
    text-transform:uppercase; font-size:.75rem; margin:0 0 .35rem;
  }
  h1{font-size:1.5rem; margin:0 0 1.5rem;}
  section{
    background:var(--beige); border-radius:1rem;
    padding:1.1rem 1.4rem; margin-bottom:1.1rem;
  }
  section h2{
    margin:0 0 .7rem; font-size:.85rem; text-transform:uppercase;
    letter-spacing:.04em; color:var(--caramel-dark);
  }
  section.overview{background:transparent; padding:0 0 .25rem; font-size:1.05rem;}
  section.practice{background:var(--caramel-light);}
  ul,ol{margin:.25rem 0; padding-left:1.2rem;}
  li{margin-bottom:.6rem;}
  p{margin:.5rem 0;}
  .vocab-grid{display:grid; grid-template-columns:auto auto 1fr; gap:.4rem 1.1rem; align-items:baseline;}
  .vocab-category{
    grid-column:1 / -1; font-weight:700; text-transform:uppercase;
    letter-spacing:.04em; font-size:.78rem; color:var(--caramel-dark);
    margin-top:.5rem; padding-top:.5rem; border-top:1px solid var(--beige-dark);
  }
  .vocab-category:first-child{margin-top:0; padding-top:0; border-top:none;}
  .vocab-word{font-weight:700;}
  .vocab-pron{color:var(--ink-muted); font-style:italic; font-size:.9rem; white-space:nowrap;}
  .vocab-meaning{color:var(--ink);}
  .example{margin-bottom:.9rem; padding-bottom:.9rem; border-bottom:1px solid var(--beige-dark);}
  .example:last-child{border-bottom:none; margin-bottom:0; padding-bottom:0;}
  .example .tr{font-weight:600; margin:0;}
  .example .pron{color:var(--ink-muted); font-style:italic; display:block; font-size:.9rem; margin:.15rem 0;}
  .example .en{color:var(--ink); margin:.15rem 0 0;}
  pre{
    background:var(--cream); border:1px solid var(--beige-dark); border-radius:.6rem;
    padding:.85rem 1rem; overflow-x:auto; font-size:.82rem; white-space:pre; margin:0;
  }
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
        file: `content/turkish/${fileName}`,
      };
    }),
  }));

  const manifest = {
    classroom: { language: "Turkish", level: "Beginner–Intermediate" },
    units: manifestUnits,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  const totalLessons = parts.reduce((n, p) => n + p.lessons.length, 0);
  console.log(`Generated ${totalLessons} lessons across ${parts.length} parts into ${OUT_DIR}`);
  console.log(`Wrote ${MANIFEST_PATH}`);
}

main();
