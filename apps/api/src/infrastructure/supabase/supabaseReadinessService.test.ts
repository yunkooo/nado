import { describe, expect, it, vi } from "vitest";
import { createSupabaseReadinessService } from "./supabaseReadinessService.js";

describe("Supabase readiness service", () => {
  it("uses a new secret key only as an apikey", async () => {
    const fetcher = vi.fn(async () => Response.json([]));
    const service = createSupabaseReadinessService({
      fetch: fetcher,
      serviceRoleKey: "sb_secret_server-key",
      supabaseUrl: "https://example.supabase.co",
      timeoutMs: 50,
    });

    await expect(service.check()).resolves.toBeUndefined();

    const requestInit = fetcher.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);

    expect(headers.get("apikey")).toBe("sb_secret_server-key");
    expect(headers.has("Authorization")).toBe(false);
  });

  it("keeps a legacy service-role JWT as the bearer token", async () => {
    const fetcher = vi.fn(async () => Response.json([]));
    const service = createSupabaseReadinessService({
      fetch: fetcher,
      serviceRoleKey: "legacy-service-role-jwt",
      supabaseUrl: "https://example.supabase.co",
      timeoutMs: 50,
    });

    await expect(service.check()).resolves.toBeUndefined();

    const requestInit = fetcher.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);

    expect(headers.get("apikey")).toBe("legacy-service-role-jwt");
    expect(headers.get("Authorization")).toBe("Bearer legacy-service-role-jwt");
  });
});
