import pg from "pg";
import { createDatabase } from "../src/index";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://pgtest:pgtest@localhost:5433/postgres";

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const db = createDatabase({
  pool,
  useZodValidation: true,
});
