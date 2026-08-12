import { PrismaClient } from "@prisma/client";

// Prevents exhausting database connections during Next.js dev hot-reloading
// by reusing a single PrismaClient instance across module reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
