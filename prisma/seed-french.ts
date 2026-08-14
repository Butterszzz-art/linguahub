// prisma/seed-french.ts
//
// Populates a real "French" classroom from manifest-french.json + the
// generated HTML lesson files under content/french/ (see
// scripts/generate-french-content.ts, which produces both from the
// plain-text curriculum in content-source/french/).
//
// Unlike seed-portuguese.ts / seed-italian.ts, this script *replaces* an
// existing "French" classroom rather than skipping when one is found: the
// base prisma/seed.ts already creates a placeholder "French" classroom
// (1 unit, 2 lessons, "<p>Placeholder lesson content.</p>") as sample data,
// and this script's job is to swap that placeholder for the real 58-lesson
// course. It only ever deletes a classroom it's about to replace, inside the
// same transaction that recreates it — if the read or write half fails,
// nothing is lost.
//
// Run with: npx tsx prisma/seed-french.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const MANIFEST_PATH = path.join(process.cwd(), "manifest-french.json");

type ManifestLesson = { order: number; title: string; file: string };
type ManifestUnit = { title: string; order: number; lessons: ManifestLesson[] };
type Manifest = {
  classroom: { language: string; level?: string };
  units: ManifestUnit[];
};

async function main() {
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  // Read every lesson file up front — if any file is missing we fail fast
  // without having touched the database at all.
  const unitsWithContent = manifest.units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => {
      const filePath = path.join(process.cwd(), lesson.file);
      const contentHtml = fs.readFileSync(filePath, "utf-8");
      return { ...lesson, contentHtml };
    }),
  }));

  const classroom = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.classroom.findFirst({
        where: { language: manifest.classroom.language },
      });
      if (existing) {
        console.log(`Replacing existing "${manifest.classroom.language}" classroom (id: ${existing.id})...`);
        // Cascade manually — the schema has no onDelete: Cascade.
        const units = await tx.unit.findMany({ where: { classroomId: existing.id } });
        const unitIds = units.map((u) => u.id);
        await tx.lesson.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.unit.deleteMany({ where: { classroomId: existing.id } });
        const exams = await tx.exam.findMany({ where: { classroomId: existing.id } });
        const examIds = exams.map((e) => e.id);
        await tx.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
        await tx.question.deleteMany({ where: { examId: { in: examIds } } });
        await tx.exam.deleteMany({ where: { classroomId: existing.id } });
        await tx.classroom.delete({ where: { id: existing.id } });
      }

      const classroom = await tx.classroom.create({
        data: {
          language: manifest.classroom.language,
          level: manifest.classroom.level ?? null,
        },
      });

      for (const unit of unitsWithContent) {
        const createdUnit = await tx.unit.create({
          data: {
            classroomId: classroom.id,
            title: unit.title,
            order: unit.order,
          },
        });

        for (const lesson of unit.lessons) {
          await tx.lesson.create({
            data: {
              unitId: createdUnit.id,
              title: lesson.title,
              order: lesson.order,
              contentHtml: lesson.contentHtml,
              status: "not_started",
              timeSpentSec: 0,
            },
          });
          console.log(`  + Lesson: ${lesson.title}`);
        }
      }

      return classroom;
    },
    { timeout: 30000 },
  );

  console.log(`\nDone. Created classroom "${manifest.classroom.language}" (id: ${classroom.id}) with ${manifest.units.length} units.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
