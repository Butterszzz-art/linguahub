-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "lastStudiedAt" TIMESTAMP(3),
ADD COLUMN     "streakCount" INTEGER NOT NULL DEFAULT 0;
