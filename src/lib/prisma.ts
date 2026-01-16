import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  let url = process.env.DATABASE_URL!;

  // Remove sslmode from URL (we'll handle it via Pool config)
  url = url.replace(/[?&]sslmode=[^&]*/gi, "");
  // Clean up potential double ? or trailing ?
  url = url.replace(/\?&/, "?").replace(/\?$/, "");

  return url;
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const disableSSL = process.env.DATABASE_SSL === "false";

  const pool = new Pool({
    connectionString,
    ssl: disableSSL ? false : { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
