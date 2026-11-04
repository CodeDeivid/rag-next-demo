import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

// Dev HMR re-evaluates modules; keep one pool instead of leaking a new one per reload.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = (globalForDb.pg ??= postgres(url));

export const db = drizzle(client, { schema });
