import { describe, it, expect, vi } from "vitest";
import os from "os";
import path from "path";
import { runSchemaGeneration } from "../../src/schema-generation/schema-generator";

describe("runSchemaGeneration dbHealthCheck", () => {
  it("fails when the pool client query errors", async () => {
    const pool = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockRejectedValue(new Error("health check failed")),
        release: vi.fn(),
      }),
    };
    const outputFile = path.join(os.tmpdir(), `schema-health-${Date.now()}.ts`);
    await expect(
      runSchemaGeneration({
        pool,
        outputTypescriptFile: outputFile,
        format: false,
      }),
    ).rejects.toThrow("health check failed");
  });
});
