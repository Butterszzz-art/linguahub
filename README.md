# LinguaHub

LinguaHub is a personal language-learning platform structured like Google Classroom. Each
language gets its own classroom made up of units, lessons (pre-authored HTML content you
upload manually), progress tracking, and exams. Lesson content is entirely self-authored;
the one place this app does call out to an external API is optional AI conversation
practice and lesson enrichment (see below) — bring your own endpoint, or ignore both and
the rest of the app works exactly as before.

This is a **skeleton** build: project setup, database schema, and routing are in place with
placeholder data so the structure is navigable and testable. Upload logic and exam logic
are not fully implemented yet.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Prisma](https://www.prisma.io) + PostgreSQL
- No authentication — single-user, no login wall
- Conversation practice and lesson enrichment call [OpenRouter](https://openrouter.ai) (see
  below) — everything else has no external API involved

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`/`DIRECT_URL` with a Postgres connection string. `CONVERSATION_API_KEY`
(an [OpenRouter](https://openrouter.ai/keys) key) is only required if you want conversation
practice or lesson enrichment to work — see [Conversation practice](#conversation-practice)
below; the rest of the app runs fine without it. **Never commit a real key** — `.env` is
gitignored for exactly this reason; only `.env.example`'s placeholders belong in git.

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Seed sample data

```bash
npx prisma db seed
```

This creates a few sample classrooms (Spanish, Japanese, French) with units and lessons
containing placeholder HTML content, so the app has something to render right away.

### 4b. (Optional) Seed the Portuguese classroom

A second seed script, [prisma/seed-portuguese.ts](prisma/seed-portuguese.ts), populates a
"Portuguese" classroom from real, self-contained lesson files (each with its own tabs/quiz
via inline `<script>`) described by [manifest.json](manifest.json). It expects the actual
lesson HTML files at the paths listed in the manifest (`content/licoes/*.html` and
`content/leituras/*.html`, relative to the project root) — add those files first, then run:

```bash
npx tsx prisma/seed-portuguese.ts
```

The script is transactional and idempotent-safe: it reads every lesson file up front (so a
missing file fails before anything is written) and skips re-seeding if a "Portuguese"
classroom already exists.

### 4c. (Optional) Seed the Italian classroom

A full beginner-to-intermediate Italian curriculum (44 lessons across 5 units — pronunciation
through idiomatic expressions) lives as plain text in
[content-source/italian/](content-source/italian). [scripts/generate-italian-content.ts](scripts/generate-italian-content.ts)
parses it into self-contained per-lesson HTML (`content/italian/*.html`, styled to match the
app's palette, safe to render in [LessonFrame](components/LessonFrame.tsx)'s sandboxed iframe)
plus [manifest-italian.json](manifest-italian.json). Regenerate after editing the source text:

```bash
npx tsx scripts/generate-italian-content.ts
```

Then seed the classroom the same way as Portuguese:

```bash
npx tsx prisma/seed-italian.ts
```

[prisma/seed-italian.ts](prisma/seed-italian.ts) is the same transactional, idempotent-safe
pattern as `seed-portuguese.ts`.

### 4d. (Optional) Seed the French classroom

A full beginner-to-advanced French curriculum (58 lessons across 7 units — pronunciation
through idiomatic expressions) lives as plain text in
[content-source/french/](content-source/french), parsed by
[scripts/generate-french-content.ts](scripts/generate-french-content.ts) into
`content/french/*.html` plus [manifest-french.json](manifest-french.json), the same way as
Italian:

```bash
npx tsx scripts/generate-french-content.ts
npx tsx prisma/seed-french.ts
```

Unlike the other seed scripts, [prisma/seed-french.ts](prisma/seed-french.ts) *replaces* an
existing "French" classroom instead of skipping — the base `prisma/seed.ts` sample data already
includes a placeholder "French" classroom, and this script's job is to swap it for the real
course. It still reads every lesson file up front and does the delete-and-recreate inside one
transaction, so a missing file or a failed write can't leave you with neither version.

### 4e. (Optional) Seed the Turkish classroom

A full beginner-to-intermediate Turkish curriculum (19 lessons across 5 units — the alphabet
and vowel harmony through narrative/reported speech and unreal conditionals) lives as plain
text in [content-source/turkish/](content-source/turkish), parsed by
[scripts/generate-turkish-content.ts](scripts/generate-turkish-content.ts) into
`content/turkish/*.html` plus [manifest-turkish.json](manifest-turkish.json), the same way as
Italian and French:

```bash
npx tsx scripts/generate-turkish-content.ts
npx tsx prisma/seed-turkish.ts
```

[prisma/seed-turkish.ts](prisma/seed-turkish.ts) is the same skip-if-existing pattern as
`seed-italian.ts` (there's no placeholder "Turkish" classroom in the base seed to replace).
The generator differs from Italian/French in two ways the source text itself differs: Lesson
3's VOCABULARY groups entries under bare "Category:" sub-headers (Basics, Shopping, Directions,
...), rendered as heading rows in the vocab grid; and PRACTICE is always a numbered list rather
than free prose, rendered as an `<ol>`.

### 4f. (Optional) Seed the German classroom

A German curriculum (19 lessons across 3 units so far — sounds/gender/word order, present-tense
verbs, and the full four-case system; further parts are outlined but not yet written, per
[content-source/german/german_00_index.txt](content-source/german/german_00_index.txt)) lives as
plain text in [content-source/german/](content-source/german), parsed by
[scripts/generate-german-content.ts](scripts/generate-german-content.ts) into
`content/german/*.html` plus [manifest-german.json](manifest-german.json), the same way as the
others:

```bash
npx tsx scripts/generate-german-content.ts
npx tsx prisma/seed-german.ts
```

[prisma/seed-german.ts](prisma/seed-german.ts) is the same skip-if-existing pattern as
`seed-italian.ts`/`seed-turkish.ts`. The generator itself differs more than Turkish's did,
because the German source's own structure differs: section labels (OVERVIEW, GRAMMAR, ...) have
no trailing colon, text isn't hard-wrapped, and GRAMMAR/CONJUGATION TABLE sections freely mix
prose, "- " bullets, "N. " numbered lists, and Markdown-style "\| a \| b \|" pipe tables (parsed
into real `<table>` markup) in any order — so `generate-german-content.ts` uses one generic
block parser, `renderRichText()`, for OVERVIEW/GRAMMAR/CONJUGATION TABLE/NOTES/PRACTICE alike,
rather than Turkish's separate bullet/paragraph/practice renderers. VOCABULARY and EXAMPLES are
"- " prefixed and use an em dash (" — ") as the word/translation separator, rather than Italian/
Turkish's bare hyphen.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                                 Dashboard — grid of classrooms
  classroom/[id]/page.tsx                  Syllabus view — units & lessons
  classroom/[id]/lesson/[lessonId]/page.tsx  Lesson viewer
  classroom/[id]/lesson/[lessonId]/actions.ts  Server action: mark lesson complete
  classroom/[id]/exam/[examId]/page.tsx    Exam page (placeholder)
  classroom/[id]/exam/[examId]/edit/page.tsx  Exam builder (placeholder)
  classroom/[id]/conversation/[conversationId]/page.tsx  Conversation practice chat
  classroom/[id]/import/page.tsx           Import a course from a PDF URL
  upload/page.tsx                          Lesson upload form (UI only)
  api/conversations/route.ts               Start a conversation
  api/conversations/[id]/messages/route.ts  Send a message, get the AI reply
  api/lessons/[id]/enrich/route.ts         Run AI enrichment on a lesson
  api/import/detect-units/route.ts         Fetch+extract+split a PDF, return detected units for review
  api/import/generate-lessons/route.ts     Restructure+render selected units into real lessons
components/                                Shared layout pieces (nav, page container, LessonFrame, etc.)
components/conversation/                   Conversation practice UI (start button, chat)
components/import/                         PDF-import UI (URL form, unit review/selection)
lib/prisma.ts                              Prisma client singleton
lib/openrouter.ts                          Shared OpenRouter (openrouter.ai) chat-completions client
lib/conversationProvider.ts                Conversation-practice system prompt + reply
lib/contentEnrichment.ts                   Lesson-enrichment prompt + response parsing
lib/lessonRenderer.ts                      Structured sections -> lesson HTML (shared with PDF import)
lib/pdfImport/                             Fetch/extract/split/restructure pipeline for PDF import
prisma/schema.prisma                       Database schema
prisma/seed.ts                             Sample data seed script
prisma/seed-portuguese.ts                  Optional real-content seed script (see below)
prisma/seed-italian.ts                     Optional real-content seed script (see below)
prisma/seed-french.ts                      Optional real-content seed script (see below)
prisma/seed-turkish.ts                     Optional real-content seed script (see below)
prisma/seed-german.ts                      Optional real-content seed script (see below)
manifest.json                              Classroom→unit→lesson map for the Portuguese seed
manifest-italian.json                      Classroom→unit→lesson map for the Italian seed
manifest-french.json                       Classroom→unit→lesson map for the French seed
manifest-turkish.json                      Classroom→unit→lesson map for the Turkish seed
manifest-german.json                       Classroom→unit→lesson map for the German seed
content-source/italian/*.txt               Raw Italian curriculum text (parser input)
content-source/french/*.txt                Raw French curriculum text (parser input)
content-source/turkish/*.txt               Raw Turkish curriculum text (parser input)
content-source/german/*.txt                Raw German curriculum text (parser input)
scripts/generate-italian-content.ts        Parses content-source/italian into content/italian + the manifest
scripts/generate-french-content.ts         Parses content-source/french into content/french + the manifest
scripts/generate-turkish-content.ts        Parses content-source/turkish into content/turkish + the manifest
scripts/generate-german-content.ts         Parses content-source/german into content/german + the manifest
```

## Database Schema

- **Classroom** — one per language, has many units, exams, and conversations
- **Unit** — ordered group of lessons within a classroom
- **Lesson** — a single piece of content (`contentHtml`), with status and time-spent tracking,
  plus optional AI enrichment (`summary`, `keyVocabulary`, `keyGrammarPoints`, `enrichedAt`)
- **Exam** — belongs to a classroom, has many questions and attempts
- **Question** — belongs to an exam
- **ExamAttempt** — a recorded attempt at an exam
- **Conversation** — a practice-chat session, belongs to a `Classroom`, optionally scoped to
  one `Lesson`
- **ConversationMessage** — one turn (`role: "user" | "assistant"`, `content`) in a conversation

## Conversation practice

"🗣️ Start a conversation" (classroom page) and "🗣️ Practice this lesson" (lesson page) start a
chat with an AI partner, powered by [OpenRouter](https://openrouter.ai) via the shared client in
[lib/openrouter.ts](lib/openrouter.ts). Get a key at [openrouter.ai/keys](https://openrouter.ai/keys)
and set `CONVERSATION_API_KEY` in `.env` — it defaults to a free-tier model
(`meta-llama/llama-3.3-70b-instruct:free`), overridable via `CONVERSATION_API_MODEL` (e.g. to a
paid model for better quality) and `CONVERSATION_API_URL` (e.g. to point at a different
OpenAI-compatible provider entirely).

Data model: `Conversation` (belongs to a `Classroom`, optional `title` for a scenario label, null
= free chat, optional `lessonId` — see below) has many `ConversationMessage` rows
(`role: "user" | "assistant"`, `content`). The send-message route
([app/api/conversations/[id]/messages/route.ts](app/api/conversations/[id]/messages/route.ts))
saves the learner's message *before* calling the provider, so a failed/slow API response never
loses their turn — only the assistant's reply is missing until they retry.

**Acting like a teacher, not a generic chatbot**: `buildSystemPrompt` in `conversationProvider.ts`
grounds the AI partner in what's actually been taught. A lesson page's "🗣️ Practice this lesson"
button starts a conversation with `lessonId` set, which narrows the persona to reinforcing that
one lesson's vocab/grammar (see `focusLesson` below). Starting a conversation from the classroom
level instead (no `lessonId`) grounds it in every lesson the student has completed or started so
far (`coveredMaterial`) — so it favors material they've actually studied rather than guessing from
the level label alone.

Not yet implemented: streaming replies (the whole reply is awaited and returned as one chunk —
fine for a non-streaming custom endpoint, but worth revisiting if yours supports SSE), and voice
input/output.

## Content enrichment

"✨ Enrich with AI" on a lesson page ([components/LessonEnrichment.tsx](components/LessonEnrichment.tsx))
calls the same OpenRouter client as conversation practice, but for a different job: distilling a
lesson's plain-text content (its HTML stripped via `sanitize-html`) into a short `summary`, a
`keyVocabulary` list, and `keyGrammarPoints` — stored directly on the `Lesson` row
([app/api/lessons/[id]/enrich/route.ts](app/api/lessons/[id]/enrich/route.ts),
[lib/contentEnrichment.ts](lib/contentEnrichment.ts)). This is what makes the "teacher" framing
above actually work: without it, the conversation partner would only know a lesson's *title*, not
what it covers. Enrichment is manual/on-demand (a button, not automatic on upload) since it's an
extra API call with its own cost/latency.

## Importing a course from a PDF URL

"📥 Import from URL" on a classroom page (`app/classroom/[id]/import/`) fetches a course PDF from
a URL, extracts its text ([lib/pdfImport/extractPdfText.ts](lib/pdfImport/extractPdfText.ts) —
text-layer PDFs only; a scanned-image PDF with no text layer raises a clear error rather than
silently importing nothing), splits it into per-unit chunks by heading pattern
([lib/pdfImport/splitUnits.ts](lib/pdfImport/splitUnits.ts) — tries `UNIT N`, `LESSON N`,
`UNIDAD N`, `CHAPTER N` in turn), and shows the detected units for review **before** anything is
saved or sent to an API — a bad automated split is meant to be obvious and cheap to fix at this
step, not discovered after fifteen API calls.

Once you confirm which detected units to import, each one's raw text is restructured by the same
OpenRouter client as conversation practice/enrichment
([lib/pdfImport/restructureUnit.ts](lib/pdfImport/restructureUnit.ts) — a third job against
`lib/openrouter.ts`) into the app's standard lesson sections, then rendered through
[lib/lessonRenderer.ts](lib/lessonRenderer.ts) — a generalized, parameterized version of the
rendering half of `scripts/generate-italian-content.ts` (and its French/German/Turkish siblings),
so imported lessons look identical to hand-authored ones. One unit failing to restructure doesn't
sink the rest of the batch — each is attempted independently and reported per-unit.

Fetching a user-supplied URL from the server is a classic SSRF vector (e.g. a "PDF URL" of
`http://169.254.169.254/...` reaching into the server's own network), so
[lib/pdfImport/fetchPdfBuffer.ts](lib/pdfImport/fetchPdfBuffer.ts) resolves the hostname and
refuses anything that lands on a loopback/private/link-local address before fetching it, on top of
the existing http(s)-only and file-size/signature checks.

**This is built for genuinely open-license/public-domain sources** — it was scoped specifically
around the U.S. government's FSI (Foreign Service Institute) course volumes, which are public
domain. It is NOT a general-purpose scraper: pointing it at a copyrighted commercial course's
website would import that site's copyrighted content just as surely as scanning a copyrighted
textbook would, regardless of the source being a URL instead of a file. Restrict what you point
this at accordingly.

## Lesson rendering

Lessons render inside a sandboxed `<iframe>` ([components/LessonFrame.tsx](components/LessonFrame.tsx))
rather than being injected directly into the page. This lets a lesson be a fully
self-contained interactive HTML document (its own `<style>`/`<script>` — tabs, a scored
quiz, etc.) without that script ever touching the parent app's DOM, cookies, or storage:
the iframe uses `sandbox="allow-scripts"` with no `allow-same-origin`. A "Mark as complete"
button below the frame updates `Lesson.status` via a server action
([actions.ts](app/classroom/[id]/lesson/[lessonId]/actions.ts)) — it's intentionally
separate from whatever happens inside the sandboxed content.

## Status

This pass covers project setup, schema/migrations, routing, a basic layout shell, and a
working "mark lesson complete" flow. Not yet implemented: the lesson upload flow (including
HTML sanitization via `sanitize-html` for user-pasted content — the sandboxed-iframe
approach above is a separate, complementary mitigation for content that's *meant* to run
scripts), exam-taking logic, the exam builder, and time-based progress tracking.

Conversation practice and lesson enrichment (above) are wired up end-to-end against OpenRouter —
just add `CONVERSATION_API_KEY` to `.env` to enable them. Run `npx prisma migrate dev` after
pulling this change to apply the new `Conversation`/`ConversationMessage` tables and `Lesson`'s
enrichment columns.
