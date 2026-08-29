import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the database connection URL out of schema.prisma and into
// this config file. It's used by the Prisma CLI (migrate / db push / studio);
// at runtime the URL is passed to PrismaClient via a driver adapter (see
// lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
