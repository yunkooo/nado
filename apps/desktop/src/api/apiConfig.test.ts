import { describe, expect, it } from "vitest";
import {
  NADO_PRODUCTION_API_BASE_URL,
  resolveApiUrl,
  resolveDesktopApiBaseUrl,
} from "./apiConfig";

describe("desktop API config", () => {
  it("uses the configured API base URL in development to avoid slow proxy requests", () => {
    expect(
      resolveDesktopApiBaseUrl({
        configuredApiBaseUrl: "https://api.example.com",
        isDev: true,
      }),
    ).toBe("https://api.example.com");
  });

  it("keeps development API calls relative only when no API base URL is configured", () => {
    expect(
      resolveDesktopApiBaseUrl({
        configuredApiBaseUrl: undefined,
        isDev: true,
      }),
    ).toBeUndefined();
  });

  it("uses the configured API base URL in packaged builds", () => {
    expect(
      resolveDesktopApiBaseUrl({
        configuredApiBaseUrl: " https://api.example.com/ ",
        isDev: false,
      }),
    ).toBe("https://api.example.com");
  });

  it("falls back to the production backend instead of a packaged relative URL", () => {
    expect(
      resolveDesktopApiBaseUrl({
        configuredApiBaseUrl: undefined,
        isDev: false,
      }),
    ).toBe(NADO_PRODUCTION_API_BASE_URL);
    expect(resolveApiUrl("/api/vocabulary", undefined, false)).toBe(
      `${NADO_PRODUCTION_API_BASE_URL}/api/vocabulary`,
    );
  });

  it("ignores unsupported API URL schemes", () => {
    expect(
      resolveDesktopApiBaseUrl({
        configuredApiBaseUrl: "file:///tmp/api",
        isDev: false,
      }),
    ).toBe(NADO_PRODUCTION_API_BASE_URL);
  });
});
