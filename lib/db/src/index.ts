import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: any;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[AI Studio] Database pool initialization failed:", err);
  }
}

if (!db) {
  console.warn("[AI Studio] DATABASE_URL not set — fallback db proxy active");
  const createChainableMock = (): any => {
    const mockFn: any = (..._args: any[]) => mockProxy;
    const mockProxy: any = new Proxy(mockFn, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (val: any) => void) => resolve([]);
        }
        if (prop === "catch") {
          return () => Promise.resolve([]);
        }
        if (prop === "finally") {
          return (cb: () => void) => {
            cb();
            return Promise.resolve([]);
          };
        }
        if (prop === Symbol.iterator || prop === Symbol.asyncIterator) {
          return undefined;
        }
        return mockProxy;
      },
      apply(_target, _thisArg, _argArray) {
        return mockProxy;
      },
    });
    return mockProxy;
  };

  db = new Proxy(
    {
      $count: async () => 0,
      select: createChainableMock,
      insert: createChainableMock,
      update: createChainableMock,
      delete: createChainableMock,
      execute: createChainableMock,
      transaction: async (cb: any) => cb(db),
      query: new Proxy({}, { get: () => createChainableMock() }),
    },
    {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return createChainableMock();
      },
    }
  );
}

export { pool, db };
export * from "./schema";
