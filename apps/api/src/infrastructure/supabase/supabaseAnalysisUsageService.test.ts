import { describe, expect, it, vi } from "vitest";
import { createSupabaseAnalysisUsageService } from "./supabaseAnalysisUsageService.js";

const options = {
  serviceRoleKey: "service-role-key",
  supabaseUrl: "https://example.supabase.co",
  timeoutMs: 50,
};

describe("Supabase analysis usage service", () => {
  it("consumes usage with one authenticated REST request", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ consumed: true, request_count: 1 }),
    );
    const service = createSupabaseAnalysisUsageService({
      ...options,
      fetch: fetcher,
    });

    await expect(
      service.consume({ ipHash: "hashed-ip", userId: null }),
    ).resolves.toEqual({
      limit: null,
      ok: true,
      remaining: null,
      used: 1,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/consume_analysis_usage",
      expect.objectContaining({
        body: expect.stringContaining('"p_ip_hash":"hashed-ip"'),
        headers: expect.objectContaining({
          apikey: "service-role-key",
          Authorization: "Bearer service-role-key",
        }),
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("does not retry a failed usage consume request", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "temporary failure" }, { status: 503 }),
    );
    const service = createSupabaseAnalysisUsageService({
      ...options,
      fetch: fetcher,
    });

    await expect(
      service.consume({ ipHash: "hashed-ip", userId: null }),
    ).rejects.toMatchObject({
      code: "supabase_unavailable",
      retryable: true,
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not send a new Supabase secret key as a bearer token", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ consumed: true, request_count: 1 }),
    );
    const service = createSupabaseAnalysisUsageService({
      ...options,
      fetch: fetcher,
      serviceRoleKey: "sb_secret_server-key",
    });

    await expect(
      service.consume({ ipHash: "hashed-ip", userId: null }),
    ).resolves.toMatchObject({ ok: true });

    const requestInit = fetcher.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);

    expect(headers.get("apikey")).toBe("sb_secret_server-key");
    expect(headers.has("Authorization")).toBe(false);
  });
});
