import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

// Reuse one connection pool across dev hot reloads.
const globalForDb = globalThis as unknown as { db?: Db };

function connect(): Db {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const instance = drizzle(postgres(url, { max: 10 }), { schema });
  globalForDb.db = instance;
  return instance;
}

// Connects on first use, not at import: `next build` imports route modules
// without a database (Railway has no DATABASE_URL at build time).
export const db = new Proxy({} as Db, {
  get: (_, prop) => Reflect.get(connect(), prop),
});
