import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { loadRootEnv } from "./rootEnv.js";

describe("loadRootEnv", () => {
  it("loads the repository root env file by default", () => {
    const expectedRootEnvPath = fileURLToPath(
      new URL("../../../../../.env", import.meta.url),
    );
    const loadEnvFile = vi.fn();

    expect(
      loadRootEnv({
        exists: (path) => path === expectedRootEnvPath,
        loadEnvFile,
      }),
    ).toBe(true);

    expect(loadEnvFile).toHaveBeenCalledWith(expectedRootEnvPath);
  });

  it("loads the provided env file when it exists", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nado-env-"));
    const envPath = join(tempDir, ".env");
    const loadEnvFile = vi.fn();

    writeFileSync(envPath, "OPENAI_API_KEY=test-key\n");

    try {
      expect(loadRootEnv({ envPath, loadEnvFile })).toBe(true);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }

    expect(loadEnvFile).toHaveBeenCalledWith(envPath);
  });

  it("does not load anything when the env file is missing", () => {
    const loadEnvFile = vi.fn();

    expect(
      loadRootEnv({
        envPath: join(tmpdir(), "nado-missing-env", ".env"),
        loadEnvFile,
      }),
    ).toBe(false);
    expect(loadEnvFile).not.toHaveBeenCalled();
  });
});
