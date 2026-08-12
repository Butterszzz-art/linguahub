# LinguaHub

LinguaHub is a personal language-learning platform structured like Google Classroom. Each
language gets its own classroom made up of units, lessons (pre-authored HTML content you
upload manually), progress tracking, and exams. There's no AI or external API involved
anywhere in this app — content is entirely self-authored.

This is a **skeleton** build: project setup, database schema, and routing are in place with
placeholder data so the structure is navigable and testable. Upload logic, exam logic, and
real progress tracking are not implemented yet.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Prisma](https://www.prisma.io) + SQLite
- No authentication — single-user, no login wall
- No external APIs

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

The default `.env` points Prisma at a local SQLite file (`prisma/dev.db`) — no changes
needed for local development.

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
  upload/page.tsx                          Lesson upload form (UI only)
components/                                Shared layout pieces (nav, page container, LessonFrame, etc.)
lib/prisma.ts                              Prisma client singleton
prisma/schema.prisma                       Database schema
prisma/seed.ts                             Sample data seed script
prisma/seed-portuguese.ts                  Optional real-content seed script (see below)
manifest.json                              Classroom→unit→lesson map for the Portuguese seed
```

## Database Schema

- **Classroom** — one per language, has many units and exams
- **Unit** — ordered group of lessons within a classroom
- **Lesson** — a single piece of content (`contentHtml`), with status and time-spent tracking
- **Exam** — belongs to a classroom, has many questions and attempts
- **Question** — belongs to an exam
- **ExamAttempt** — a recorded attempt at an exam

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
