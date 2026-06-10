import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileApiConfigurationError, resolveMobileApiUrl } from "./apiConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveMobileApiUrl", () => {
  it("uses the iOS simulator local API server when no base URL is configured", () => {
    expect(
      resolveMobileApiUrl("/api/vocabulary", undefined, { platform: "ios" }),
    ).toBe("http://localhost:4000/api/vocabulary");
  });

  it("uses the Android emulator host bridge when no base URL is configured", () => {
    expect(
      resolveMobileApiUrl("/api/vocabulary", undefined, {
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:4000/api/vocabulary");
  });

  it("uses relative API routes for Expo web when no base URL is configured", () => {
    expect(
      resolveMobileApiUrl("/api/vocabulary", undefined, { platform: "web" }),
    ).toBe("/api/vocabulary");
  });

  it("does not fall back to simulator localhost URLs in production native builds", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      resolveMobileApiUrl("/api/vocabulary", undefined, { platform: "ios" }),
    ).toThrow(MobileApiConfigurationError);
  });

  it("joins configured Railway-style base URLs with API paths", () => {
    expect(
      resolveMobileApiUrl(
        "/api/vocabulary",
        "https://nadoapi-production.up.railway.app/",
      ),
    ).toBe("https://nadoapi-production.up.railway.app/api/vocabulary");
  });
});
