// lib/lessonRenderer.ts
//
// The same rendering conventions used by scripts/generate-italian-content.ts
// (and its French/German/Turkish siblings), generalized so the PDF import
// pipeline (lib/pdfImport/) produces lessons that look and behave exactly
// like every other classroom's — same section types, same cream/beige/
// caramel template — without duplicating those per-language scripts or
// risking a change to their already-working output.
//
// Deliberate scope: this only exports the *rendering* half (structured
// sections -> HTML). The generate-*.ts scripts' *parsing* half (plain-text
// with "####"/"===="/ALL-CAPS markup -> structured sections) has no
// equivalent here, because the PDF import pipeline gets its structured
// sections directly from the AI restructuring step
// (lib/pdfImport/restructureUnit.ts) as JSON — there's no intermediate
// plain-text markup to parse.

export const SECTION_LABELS = [
  "OVERVIEW",
  "GRAMMAR",
  "CONJUGATION TABLE",
  "VOCABULARY",
  "EXAMPLES",
  "NOTES",
  "PRACTICE",
] as const;
export type SectionLabel = (typeof SECTION_LABELS)[number];
export type LessonSections = Partial<Record<SectionLabel, string>>;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SMALL_WORDS = new Set(["and", "of", "the", "a", "an", "to", "in"]);
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".,?!]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Dash-bulleted lists (GRAMMAR, NOTES): a new item starts at an unindented
// "- " line; indented lines are wrapped continuations. See
// scripts/generate-italian-content.ts for the fuller nested-sub-item variant
// this is deliberately simplified from — AI-restructured text doesn't have
// the deep hand-authored nesting the original source files do.
export function renderBullets(text: string): string {
  const items = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .reduce<string[]>((acc, line) => {
      if (/^- /.test(line)) {
        acc.push(escapeHtml(line.slice(2)));
      } else if (acc.length > 0) {
        acc[acc.length - 1] += " " + escapeHtml(line);
      } else {
        acc.push(escapeHtml(line));
      }
      return acc;
    }, []);
  return `<ul>\n${items.map((i) => `<li>${i}</li>`).join("\n")}\n</ul>`;
}

// Plain prose (OVERVIEW, PRACTICE): blank-line-separated paragraphs.
export function renderParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.split("\n").map((l) => l.trim()).join(" ").trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join("\n");
}

// VOCABULARY: one entry per line, "word (pronunciation) - meaning".
export function renderVocab(text: string): string {
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^(.+?)\s\(([^)]+)\)\s*-\s*(.+)$/);
      if (!m) {
        return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(entry)}</div><div></div><div></div></div>`;
      }
      const [, word, pron, meaning] = m;
      return `<div class="vocab-row"><div class="vocab-word">${escapeHtml(word.trim())}</div><div class="vocab-pron">${escapeHtml(pron.trim())}</div><div class="vocab-meaning">${escapeHtml(meaning.trim())}</div></div>`;
    });
  return `<div class="vocab-grid">\n${rows.join("\n")}\n</div>`;
}

// EXAMPLES: one entry per line, "sentence - phonetic - translation".
export function renderExamples(text: string): string {
  const blocks = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(" - ");
      if (parts.length < 2) {
        return `<div class="example"><p class="it">${escapeHtml(entry)}</p></div>`;
      }
      const first = parts[0];
      const last = parts[parts.length - 1];
      const pron = parts.slice(1, -1).join(" - ");
      return `<div class="example"><p class="it">${escapeHtml(first)}</p><span class="pron">${escapeHtml(pron)}</span><p class="en">${escapeHtml(last)}</p></div>`;
    });
  return blocks.join("\n");
}

// CONJUGATION TABLE: preserved verbatim in a monospace block.
export function renderTable(text: string): string {
  return `<pre>${escapeHtml(text)}</pre>`;
}

export function renderLessonHtml(options: {
  langCode: string;
  kicker: string; // e.g. "FSI Spanish Basic Course · Volume 1 · Unit 3"
  title: string;
  sections: LessonSections;
}): string {
  const { langCode, kicker, title, sections: s } = options;
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
<html lang="${escapeHtml(langCode)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
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
  .vocab-grid{display:grid; grid-template-columns:auto auto 1fr; gap:.4rem 1.1rem; align-items:baseline;}
  .vocab-word{font-weight:700;}
  .vocab-pron{color:var(--ink-muted); font-style:italic; font-size:.9rem; white-space:nowrap;}
  .vocab-meaning{color:var(--ink);}
  .example{margin-bottom:.9rem; padding-bottom:.9rem; border-bottom:1px solid var(--beige-dark);}
  .example:last-child{border-bottom:none; margin-bottom:0; padding-bottom:0;}
  .example .it{font-weight:600; margin:0;}
  .example .pron{color:var(--ink-muted); font-style:italic; display:block; font-size:.9rem; margin:.15rem 0;}
  .example .en{color:var(--ink); margin:.15rem 0 0;}
  pre{
    background:var(--cream); border:1px solid var(--beige-dark); border-radius:.6rem;
    padding:.85rem 1rem; overflow-x:auto; font-size:.82rem; white-space:pre; margin:0;
  }
</style>
</head>
<body>
  <p class="kicker">${escapeHtml(kicker)}</p>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>
`;
}
