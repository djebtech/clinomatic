import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  // Supabase Transaction Pooler (port 6543) requires no SSL override;
  // Direct connection (port 5432) requires ssl: { rejectUnauthorized: false }.
  const isDirectConnection = connectionString.includes(":5432");
  const pool = new Pool({
    connectionString,
    ssl: isDirectConnection ? { rejectUnauthorized: false } : undefined,
    // Vercel serverless: keep pool small, short idle timeout
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
