import { describe, it, expect, vi } from "vitest";
import {
  createGetClient,
  createPoolConnect,
} from "../../src/database/db-client";
import { runInTransactionContext } from "../../src/database/transaction-context";
import { PiquelErrorCode } from "../../src/errors";

function makeClient() {
  return {
    query: vi.fn(),
    release: vi.fn(),
  };
}

describe("createPoolConnect", () => {
  it("returns pool.connect directly when timeout is undefined", async () => {
    const client = makeClient();
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    };
    const connect = createPoolConnect(pool, undefined);

    const result = await connect();
    expect(pool.connect).toHaveBeenCalledOnce();
    expect(result).toBe(client);
  });

  it("returns pool.connect directly when timeout is non-positive", async () => {
    const client = makeClient();
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    };
    const connect = createPoolConnect(pool, 0);

    const result = await connect();
    expect(pool.connect).toHaveBeenCalledOnce();
    expect(result).toBe(client);
  });

  it("does not release client when connect finishes before timeout", async () => {
    const client = makeClient();
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    };
    const connect = createPoolConnect(pool, 50);

    const result = await connect();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(result).toBe(client);
    expect(client.release).not.toHaveBeenCalled();
  });

  it("throws CONNECTION_TIMEOUT when connect exceeds timeout", async () => {
    const pendingConnection = new Promise<never>((resolve) => {
      void resolve;
    });
    const pool = {
      connect: vi.fn().mockReturnValue(pendingConnection),
    };
    const connect = createPoolConnect(pool, 25);

    await expect(connect()).rejects.toMatchObject({
      code: PiquelErrorCode.CONNECTION_TIMEOUT,
    });
  });

  it("releases client when connect resolves after timeout", async () => {
    const client = makeClient();
    let resolveConnect: ((c: typeof client) => void) | undefined;
    const pool = {
      connect: vi.fn().mockImplementation(
        () =>
          new Promise<typeof client>((resolve) => {
            resolveConnect = resolve;
          }),
      ),
    };
    const connect = createPoolConnect(pool, 25);

    const pending = connect();
    await expect(pending).rejects.toMatchObject({
      code: PiquelErrorCode.CONNECTION_TIMEOUT,
    });

    if (!resolveConnect) {
      throw new Error("Expected connect resolver to be assigned");
    }
    resolveConnect(client);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(client.release).toHaveBeenCalledOnce();
  });

  it("propagates immediate connect rejection before timeout", async () => {
    const connectError = new Error("connect failed immediately");
    const pool = {
      connect: vi.fn().mockRejectedValue(connectError),
    };
    const connect = createPoolConnect(pool, 25);

    await expect(connect()).rejects.toBe(connectError);
  });

  it("rejects if timeout timer cannot be created", async () => {
    const timerError = new Error("timer unavailable");
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(() => {
        throw timerError;
      });
    const pool = {
      connect: vi.fn().mockImplementation(
        () =>
          new Promise<never>((resolve) => {
            void resolve;
          }),
      ),
    };
    const connect = createPoolConnect(pool, 25);

    await expect(connect()).rejects.toBe(timerError);
    setTimeoutSpy.mockRestore();
  });
});

describe("createGetClient", () => {
  it("uses ambient transaction client without releasing after query", async () => {
    const ambientClient = makeClient();
    const poolClient = makeClient();
    const poolConnect = vi.fn().mockResolvedValue(poolClient);
    const getClient = createGetClient(poolConnect);

    await runInTransactionContext(ambientClient, "context", async () => {
      const resolved = await getClient();
      expect(resolved).toEqual({
        client: ambientClient,
        releaseAfterQuery: false,
      });
    });

    expect(poolConnect).not.toHaveBeenCalled();
  });

  it("falls back to pool client and releases after query", async () => {
    const poolClient = makeClient();
    const poolConnect = vi.fn().mockResolvedValue(poolClient);
    const getClient = createGetClient(poolConnect);

    const resolved = await getClient();
    expect(resolved).toEqual({
      client: poolClient,
      releaseAfterQuery: true,
    });
    expect(poolConnect).toHaveBeenCalledOnce();
  });
});
