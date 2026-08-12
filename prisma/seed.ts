import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe existing data so the seed script can be re-run cleanly.
  await prisma.examAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.classroom.deleteMany();

  const spanish = await prisma.classroom.create({
    data: {
      language: "Spanish",
      level: "Beginner",
      units: {
        create: [
          {
            title: "Unit 1: Greetings & Introductions",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Saying Hello and Goodbye",
                  order: 1,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
                {
                  title: "Introducing Yourself",
                  order: 2,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
                {
                  title: "Numbers 0-20",
                  order: 3,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
              ],
            },
          },
          {
            title: "Unit 2: Everyday Life",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Talking About Your Family",
                  order: 1,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
                {
                  title: "Ordering Food at a Restaurant",
                  order: 2,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
              ],
            },
          },
        ],
      },
      exams: {
        create: [
          {
            title: "Unit 1 Checkpoint",
            questions: {
              create: [
                {
                  type: "multiple_choice",
                  prompt: 'How do you say "hello" in Spanish?',
                  options: JSON.stringify(["Hola", "Adiós", "Gracias", "Por favor"]),
                  correctAnswer: "Hola",
                  order: 1,
                },
                {
                  type: "short_answer",
                  prompt: 'Translate: "My name is..."',
                  options: null,
                  correctAnswer: "Me llamo...",
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const japanese = await prisma.classroom.create({
    data: {
      language: "Japanese",
      level: "Beginner",
      units: {
        create: [
          {
            title: "Unit 1: Hiragana Basics",
            order: 1,
            lessons: {
              create: [
                {
                  title: "The Vowel Sounds (あ、い、う、え、お)",
                  order: 1,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
                {
                  title: "The K-Row (か、き、く、け、こ)",
                  order: 2,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
              ],
            },
          },
        ],
      },
      exams: {
        create: [
          {
            title: "Hiragana Quiz",
            questions: {
              create: [
                {
                  type: "multiple_choice",
                  prompt: "Which hiragana character makes the sound 'a'?",
                  options: JSON.stringify(["あ", "い", "う", "え"]),
                  correctAnswer: "あ",
                  order: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const french = await prisma.classroom.create({
    data: {
      language: "French",
      level: "Intermediate",
      units: {
        create: [
          {
            title: "Unit 1: Le Present",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Regular -ER Verbs",
                  order: 1,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
                {
                  title: "Common Irregular Verbs",
                  order: 2,
                  contentHtml: "<p>Placeholder lesson content.</p>",
                  status: "not_started",
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seeded classrooms:", [spanish.language, japanese.language, french.language].join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
