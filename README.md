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
  classroom/[id]/exam/[examId]/page.tsx    Exam page (placeholder)
  classroom/[id]/exam/[examId]/edit/page.tsx  Exam builder (placeholder)
  upload/page.tsx                          Lesson upload form (UI only)
components/                                Shared layout pieces (nav, page container, etc.)
lib/prisma.ts                              Prisma client singleton
prisma/schema.prisma                       Database schema
prisma/seed.ts                             Sample data seed script
```

## Database Schema

- **Classroom** — one per language, has many units and exams
- **Unit** — ordered group of lessons within a classroom
- **Lesson** — a single piece of content (`contentHtml`), with status and time-spent tracking
- **Exam** — belongs to a classroom, has many questions and attempts
- **Question** — belongs to an exam
- **ExamAttempt** — a recorded attempt at an exam

## Status

This pass covers project setup, schema/migrations, routing, and a basic layout shell only.
Not yet implemented: the lesson upload flow (including HTML sanitization via
`sanitize-html`), exam-taking logic, the exam builder, and progress calculations.
