import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createDatabase } from "../../src/database/db-definition";
import { PiquelErrorCode } from "../../src/errors";
import { sql } from "../../src/database/sql/sql-builder";

function mockPoolWithClient(client: {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}) {
  return {
    connect: vi.fn().mockResolvedValue(client),
  };
}

describe("createDatabase useZodValidation: false", () => {
  it("queryOneOrNone returns the raw row without Zod parsing", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ n: "not-a-number" }] }),
      release: vi.fn(),
    };
    const db = createDatabase({
      pool: mockPoolWithClient(client),
      useZodValidation: false,
    });

    const rowSchema = z.object({ n: z.number() });
    const row = await db.client.queryOneOrNone(sql`SELECT 1`, rowSchema);
    expect(row).toEqual({ n: "not-a-number" });
  });

  it("queryOne returns the raw row without Zod parsing", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ n: "wrong-type" }] }),
      release: vi.fn(),
    };
    const db = createDatabase({
      pool: mockPoolWithClient(client),
      useZodValidation: false,
    });

    const rowSchema = z.object({ n: z.number() });
    const row = await db.client.queryOne(sql`SELECT 1`, rowSchema);
    expect(row).toEqual({ n: "wrong-type" });
  });
});

describe("createDatabase connectionTimeoutMs", () => {
  it("throws CONNECTION_TIMEOUT when connect exceeds timeout", async () => {
    const pendingConnection = new Promise<never>((resolve) => {
      void resolve;
    });
    const pool = {
      connect: () => pendingConnection,
    };
    const db = createDatabase({
      pool,
      useZodValidation: false,
      connectionTimeoutMs: 50,
    });

    await expect(db.client.nonQuery(sql`SELECT 1`)).rejects.toMatchObject({
      code: PiquelErrorCode.CONNECTION_TIMEOUT,
    });
  });

  it("releases the client if connect completes after the timeout", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    let resolveConnect: ((c: typeof client) => void) | undefined;
    const pool = {
      connect: () =>
        new Promise<typeof client>((resolve) => {
          resolveConnect = resolve;
        }),
    };
    const db = createDatabase({
      pool,
      useZodValidation: false,
      connectionTimeoutMs: 50,
    });

    const p = db.client.nonQuery(sql`SELECT 1`);
    await expect(p).rejects.toMatchObject({
      code: PiquelErrorCode.CONNECTION_TIMEOUT,
    });

    if (!resolveConnect) {
      throw new Error("Expected connect resolver to be assigned");
    }
    resolveConnect(client);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("handles pool.connect rejection after the timeout (floating promise)", async () => {
    let rejectConnect: ((err: Error) => void) | undefined;
    const pool = {
      connect: () =>
        new Promise<never>((_, reject) => {
          rejectConnect = reject;
        }),
    };
    const db = createDatabase({
      pool,
      useZodValidation: false,
      connectionTimeoutMs: 50,
    });

    const p = db.client.nonQuery(sql`SELECT 1`);
    await expect(p).rejects.toMatchObject({
      code: PiquelErrorCode.CONNECTION_TIMEOUT,
    });

    if (!rejectConnect) {
      throw new Error("Expected connect reject to be assigned");
    }
    rejectConnect(new Error("connect failed"));
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
});
