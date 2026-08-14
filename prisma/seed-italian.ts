// prisma/seed-italian.ts
//
// Populates an "Italian" classroom from manifest-italian.json + the generated
// HTML lesson files under content/italian/ (see
// scripts/generate-italian-content.ts, which produces both from the plain-text
// curriculum in content-source/italian/).
//
// Run with: npx tsx prisma/seed-italian.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const MANIFEST_PATH = path.join(process.cwd(), "manifest-italian.json");

type ManifestLesson = { order: number; title: string; file: string };
type ManifestUnit = { title: string; order: number; lessons: ManifestLesson[] };
type Manifest = {
  classroom: { language: string; level?: string };
  units: ManifestUnit[];
};

async function main() {
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const existing = await prisma.classroom.findFirst({
    where: { language: manifest.classroom.language },
  });
  if (existing) {
    console.log(`Classroom "${manifest.classroom.language}" already exists (id: ${existing.id}). Skipping.`);
    console.log(`Delete it first if you want to re-seed from scratch.`);
    return;
  }

  // Read every lesson file up front, outside the transaction — if any file is
  // missing we fail fast without having written anything to the database yet.
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
