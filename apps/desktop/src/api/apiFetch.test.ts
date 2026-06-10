import { describe, expect, it, vi } from "vitest";
import { createApiFetch, shouldUseTauriHttpFetch } from "./apiFetch";

describe("desktop apiFetch", () => {
  it("uses Tauri HTTP for absolute API URLs in the desktop runtime", async () => {
    const browserFetch = vi.fn(async () => Response.json({ via: "browser" }));
    const tauriFetch = vi.fn(async () => Response.json({ via: "tauri" }));
    const apiFetch = createApiFetch({
      browserFetch,
      isTauri: () => true,
      loadTauriFetch: async () => tauriFetch,
    });

    const response = await apiFetch("https://nadoapi.example.com/api/analyze", {
      method: "POST",
    });

    await expect(response.json()).resolves.toEqual({ via: "tauri" });
    expect(tauriFetch).toHaveBeenCalledWith(
      "https://nadoapi.example.com/api/analyze",
      { method: "POST" },
    );
    expect(browserFetch).not.toHaveBeenCalled();
  });

  it("keeps relative dev proxy requests on browser fetch", async () => {
    const browserFetch = vi.fn(async () => Response.json({ via: "browser" }));
    const tauriFetch = vi.fn(async () => Response.json({ via: "tauri" }));
    const apiFetch = createApiFetch({
      browserFetch,
      isTauri: () => true,
      loadTauriFetch: async () => tauriFetch,
    });

    const response = await apiFetch("/api/analyze", {
      method: "POST",
    });

    await expect(response.json()).resolves.toEqual({ via: "browser" });
    expect(browserFetch).toHaveBeenCalledWith("/api/analyze", {
      method: "POST",
    });
    expect(tauriFetch).not.toHaveBeenCalled();
  });

  it("keeps browser builds on browser fetch", async () => {
    expect(
      shouldUseTauriHttpFetch("https://nadoapi.example.com/api/analyze", false),
    ).toBe(false);
  });
});
