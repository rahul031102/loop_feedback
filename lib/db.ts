import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma ORM 7 is Rust-free: PrismaClient no longer bundles a native query
 * engine and must be constructed with a driver adapter. For PostgreSQL that
 * adapter wraps a `pg` connection pool. This has no bearing on how the rest
 * of the app calls `prisma.*` - the query API is unchanged, only the setup
 * differs from earlier Prisma versions.
 *
 * We pass a plain config object rather than constructing our own `pg.Pool`:
 * @prisma/adapter-pg bundles its own nested `pg` internally, and a `pg.Pool`
 * instance from a *different* installed copy of `pg` fails TypeScript's
 * structural check against adapter-pg's expected type. A plain object
 * matching `PoolConfig`'s shape sidesteps that entirely and lets the
 * adapter construct the pool itself.
 *
 * Hosted Postgres (Neon, Supabase) requires TLS. Local development against
 * a plain `postgresql://localhost` instance does not. We enable relaxed TLS
 * verification only when the connection isn't local, matching the fix
 * documented for Prisma 7's stricter default certificate validation.
 */
function isLocalDatabase(connectionString: string): boolean {
  return /(localhost|127\.0\.0\.1)/.test(connectionString);
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your PostgreSQL connection string."
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    ssl: isLocalDatabase(connectionString) ? undefined : { rejectUnauthorized: false },
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Next.js dev mode reloads modules on every change, which would otherwise
// spawn a fresh connection pool per edit. Caching the instance on `global`
// in development (never in production, where each server instance should
// have exactly one client) avoids exhausting the database's connection
// limit during local development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
