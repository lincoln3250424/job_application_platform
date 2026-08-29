import { PrismaClient } from "@prisma/client";

// Standard Next.js Prisma singleton pattern — avoids exhausting the connection
// pool from hot-reloading in dev, and keeps one client per serverless instance
// in production. Use the Neon *pooled* connection string in DATABASE_URL
// (see README) since each serverless invocation opens its own connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
