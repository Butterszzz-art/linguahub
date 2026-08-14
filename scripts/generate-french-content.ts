// scripts/generate-french-content.ts
//
// One-off/reproducible build step: parses the plain-text French curriculum in
// content-source/french/*.txt (same "####"/"===="/"ALL-CAPS LABEL:" structure
// as the Italian course — see french_00_curriculum_index.txt) into
// self-contained per-lesson HTML files under content/french/, plus
// manifest-french.json describing the classroom/unit/lesson structure for
// prisma/seed-french.ts.
//
// Differs from generate-italian-content.ts in two ways the source text
// itself differs:
//   - VOCABULARY has no phonetic pronunciation column ("word - meaning"
//     only, sometimes two entries per line separated by 2+ spaces) and
//     EXAMPLES has no phonetic column either ("French - English").
//   - A couple of PART/LESSON header lines wrap onto a second physical line
//     (e.g. "PART 5 — ..., \n IMPERATIVE (Lessons 31-35)"), so headers are
//     parsed with a pattern that can span a newline and then whitespace-
//     collapsed, instead of assuming a single line.
//
// Run with: npx tsx scripts/generate-french-content.ts

import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "content-source", "french");
const OUT_DIR = path.join(process.cwd(), "content", "french");
const MANIFEST_PATH = path.join(process.cwd(), "manifest-french.json");

const SOURCE_FILES = [
  "french_01_foundations.txt",
  "french_02_present_tense.txt",
  "french_03_past_tenses.txt",
  "french_04_future_conditional_subjunctive.txt",
  "french_05_infinitive_participle_passive_imperative.txt",
  "french_06_pronouns_adjectives_articles.txt",
  "french_07_practical_situational.txt",
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

// Collapses a possibly-multi-line header fragment ("...SPEECH,\n  IMPERATIVE")
// into one whitespace-normalized line.
function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// --- Parsing -----------------------------------------------------------

function parsePart(fileText: string): Part {
  const partMatch = fileText.match(/^PART (\d+) — ([\s\S]+?)\s*\(Lessons/m);
  if (!partMatch) throw new Error("Could not find PART header");
  const partNum = Number(partMatch[1]);
  const partTitle = titleCase(collapseWhitespace(partMatch[2]));

  // Split on lesson dividers ("====...=="), which brackets each
  // "LESSON N: Title" line (title may itself wrap onto a 2nd line).
  // Segments alternate: [preamble, header, body, header, body, ...]
  const segments = fileText
    .split(/\n?={10,}\n?/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lessons: Lesson[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const headerMatch = segments[i].match(/^LESSON (\d+):\s*([\s\S]+)$/);
    if (!headerMatch) continue;
    const num = Number(headerMatch[1]);
    const title = collapseWhitespace(headerMatch[2]);
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
// spaces are a nested sub-item and get their own line — unless indented even
// deeper than the current sub-item's own indent, in which case they're a
// wrapped continuation of *that* sub-item.
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

// Plain prose (OVERVIEW, PRACTICE): blank-line-separated paragraphs, each
// with wrapped lines rejoined with a space.
function renderParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.split("\n").map((l) => l.trim()).join(" ").trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join("\n");
}

// VOCABULARY: "word - meaning", no pronunciation column. A physical line can
// hold two entries side by side, separated by a run of 2+ spaces; a line
// indented relative to the previous one is a wrapped continuation of the
// last entry's meaning rather than a new entry.
function renderVocab(text: string): string {
  const entries: { word: string; meaning: string }[] = [];

  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    const indent = raw.match(/^ */)![0].length;

    if (indent > 0 && entries.length > 0) {
      entries[entries.length - 1].meaning += " " + raw.trim();
      continue;
    }

    const chunks = raw.trim().split(/ {2,}/).filter(Boolean);
    for (const chunk of chunks) {
      const idx = chunk.indexOf(" - ");
      if (idx === -1) {
        entries.push({ word: chunk, meaning: "" });
      } else {
        entries.push({ word: chunk.slice(0, idx).trim(), meaning: chunk.slice(idx + 3).trim() });
      }
    }
  }

  const rows = entries.map(
    (e) =>
      `<div class="vocab-row"><div class="vocab-word">${escapeHtml(e.word)}</div><div class="vocab-meaning">${escapeHtml(e.meaning)}</div></div>`,
  );

  return `<div class="vocab-grid">\n${rows.join("\n")}\n</div>`;
}

// EXAMPLES: "French sentence - English translation (parenthetical note)."
// One entry per logical line; indented lines are wrapped continuations
// (including trailing parenthetical notes that spill onto their own line).
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
    const idx = entry.indexOf(" - ");
    if (idx === -1) {
      return `<div class="example"><p class="fr">${escapeHtml(entry)}</p></div>`;
    }
    const fr = entry.slice(0, idx);
    const en = entry.slice(idx + 3);
    return `<div class="example"><p class="fr">${escapeHtml(fr)}</p><p class="en">${escapeHtml(en)}</p></div>`;
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
${s.NOTES ? `<section><h2>Notes</h2>${renderBullets(s.NOTES)}</section>` : ""}
${s.PRACTICE ? `<section class="practice"><h2>Practice</h2>${renderParagraphs(s.PRACTICE)}</section>` : ""}
`.trim();

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(lesson.title)}</title>
<style>
  :root{
    --cream:#fdf9f2; --beige:#f3e7d6; --beige-dark:#d9bd97;
    --ink:#3a2c21; --ink-muted:#8a7663;
    --caramel:#c17f3f; --caramel-dark:#a1672f; --caramel-light:#f0d9b8;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --cream:#241a12; --beige:#33261b; --beige-dark:#4f3c2b;
      --ink:#f3e7d6; --ink-muted:#c7b39a;
      --caramel:#d99a53; --caramel-dark:#e8b578; --caramel-light:#4a3722;
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
  ul{margin:.25rem 0; padding-left:1.2rem;}
  li{margin-bottom:.6rem;}
  p{margin:.5rem 0;}
  .vocab-grid{display:grid; grid-template-columns:auto 1fr; gap:.4rem 1.1rem; align-items:baseline;}
  .vocab-word{font-weight:700;}
  .vocab-meaning{color:var(--ink);}
  .example{margin-bottom:.9rem; padding-bottom:.9rem; border-bottom:1px solid var(--beige-dark);}
  .example:last-child{border-bottom:none; margin-bottom:0; padding-bottom:0;}
  .example .fr{font-weight:600; margin:0;}
  .example .en{color:var(--ink-muted); margin:.15rem 0 0;}
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
        file: `content/french/${fileName}`,
      };
    }),
  }));

  const manifest = {
    classroom: { language: "French", level: "Beginner–Advanced" },
    units: manifestUnits,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  const totalLessons = parts.reduce((n, p) => n + p.lessons.length, 0);
  console.log(`Generated ${totalLessons} lessons across ${parts.length} parts into ${OUT_DIR}`);
  console.log(`Wrote ${MANIFEST_PATH}`);
}

main();
