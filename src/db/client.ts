import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

// Dev HMR re-evaluates modules; keep one pool instead of leaking a new one per reload.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
// prepare: false — Neon's pooled URL goes through PgBouncer, which does not keep prepared statements.
// Small pool: each serverless instance only serves a few requests at a time.
const client = (globalForDb.pg ??= postgres(url, { prepare: false, max: 5 }));

export const db = drizzle(client, { schema });
