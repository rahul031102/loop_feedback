import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma ORM 7 moved CLI/migration configuration out of schema.prisma and
// into this file, and its CLI does not auto-load .env files the way
// Next.js does for the app itself - see lib/db.ts for the runtime side.
//
// Load `.env.local` first (what this project's README and .env.example
// point to, and Next.js's own convention for local secrets), then `.env`
// as a fallback for anyone who prefers that instead. dotenv never
// overwrites a variable that's already set, so whichever file is loaded
// first wins if both exist and define the same key - `.env.local` always
// takes precedence here, matching Next.js's own resolution order.
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

// Deliberately `process.env.DATABASE_URL` here, NOT prisma/config's `env()`
// helper: `env()` throws immediately if the variable is missing, and this
// whole file - including this value - is evaluated for every Prisma CLI
// command, `prisma generate` included. `generate` only reads schema.prisma
// to produce the client; it never opens a connection, so it shouldn't be
// blocked by a DATABASE_URL that isn't configured yet (e.g. right after a
// fresh `npm install`, before .env.local exists at all - confirmed this is
// exactly the failure a missing value used to cause here). `migrate`/`db
// seed`/`studio` still fail clearly, from Prisma or `pg` itself, the
// moment they actually try to connect with an empty string.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    // No `-r dotenv/config` here deliberately - prisma/seed.ts loads its
    // own env vars at the top with the same .env.local-first precedence,
    // so there's exactly one place this logic lives.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
