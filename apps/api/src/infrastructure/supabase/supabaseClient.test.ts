import { describe, expect, it, vi } from "vitest";
import {
  SupabaseRequestTimeoutError,
  createSupabaseFetchWithTimeout,
  resolveServiceRoleSupabaseRequestConfig,
  resolveSupabaseTimeoutMs,
} from "./supabaseClient.js";

describe("Supabase client configuration", () => {
  it("rejects invalid timeout values", () => {
    expect(() => resolveSupabaseTimeoutMs({ timeoutMs: 0 })).toThrow(
      "Supabase timeout must be a positive integer.",
    );
    expect(() => resolveSupabaseTimeoutMs({ timeoutMs: 1.5 })).toThrow(
      "Supabase timeout must be a positive integer.",
    );
  });

  it("times out even when a fetch implementation ignores abort signals", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(async () => new Promise<Response>(() => undefined));
      const request = createSupabaseFetchWithTimeout(
        fetcher,
        5,
      )("https://example.supabase.co/rest/v1/items");
      const assertion = expect(request).rejects.toBeInstanceOf(
        SupabaseRequestTimeoutError,
      );

      await vi.advanceTimersByTimeAsync(5);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("normalizes the service URL and applies the configured fetch", async () => {
    const response = Response.json({ ok: true });
    const fetcher = vi.fn(async () => response);
    const config = resolveServiceRoleSupabaseRequestConfig({
      fetch: fetcher,
      serviceRoleKey: "service-role-key",
      supabaseUrl: "https://example.supabase.co/",
      timeoutMs: 50,
    });

    await expect(config.fetch("https://example.supabase.co")).resolves.toBe(
      response,
    );
    expect(config.supabaseUrl).toBe("https://example.supabase.co");
    expect(config.serviceRoleKey).toBe("service-role-key");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
