import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { z } from "zod";
import { sql } from "../../src/database/sql/sql-builder";
import {
  setupDumpTestDb,
  teardownDumpTestDb,
  setupTestDb,
  resetDb,
  type DumpTestDb,
  type TestDb,
} from "../helpers/db";
import { pagila_schema } from "../fixtures/pagila-schema";

let testDb: DumpTestDb;

const PAGILA_TABLES = Object.values(pagila_schema);

beforeAll(async () => {
  testDb = await setupDumpTestDb("tests/fixtures/pagila.sql", {
    useZodValidation: true,
  });
});

afterAll(async () => {
  await teardownDumpTestDb(testDb);
});

describe("data fetching", () => {
  for (const table of PAGILA_TABLES) {
    it(`fetches data from ${table.tableName}`, async () => {
      const result = await testDb.pool.query(
        `SELECT * FROM ${table.tableName}`,
      );
      expect(result.rows.length).toBeGreaterThan(0);
    });
  }
});

describe("jsonb data fetching with overrideZodType", () => {
  let jsonbTestDb: TestDb;

  const payloadSchema = z.object({
    user: z.object({
      name: z.string(),
      profile: z.object({
        city: z.string(),
      }),
    }),
  });

  const rowSchema = z.object({
    id: z.number(),
    payload: payloadSchema,
  });

  beforeEach(async () => {
    jsonbTestDb = await setupTestDb("tests/fixtures/jsonb-example.sql");
  });

  afterEach(async () => {
    await resetDb(jsonbTestDb);
  });

  it("fetches and validates jsonb data with a typed zod schema", async () => {
    const rows = await jsonbTestDb.db.client.query(
      sql`SELECT * FROM simple_jsonb_example`,
      rowSchema,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      payload: {
        user: {
          name: "Alice",
          profile: { city: "Berlin" },
        },
      },
    });
  });

  it("rejects jsonb data that does not match the schema", async () => {
    const wrongSchema = z.object({
      id: z.number(),
      payload: z.object({ nonexistent: z.string() }),
    });
    await expect(
      jsonbTestDb.db.client.queryOne(
        sql`SELECT * FROM simple_jsonb_example WHERE id = ${1}`,
        wrongSchema,
      ),
    ).rejects.toThrow();
  });
});
