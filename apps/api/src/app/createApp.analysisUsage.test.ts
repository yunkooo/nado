import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

describe("createApp analysis usage identity", () => {
  it("uses an authenticated user id for analyze usage when a bearer token is valid", async () => {
    const identities: unknown[] = [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: 5,
            ok: true,
            remaining: 4,
            used: 1,
          };
        },
      },
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(identities).toEqual([{ ipHash: null, userId: "user_1" }]);
  });

  it("uses a hashed client IP for anonymous analyze usage", async () => {
    const identities: Array<{ ipHash: string | null; userId: string | null }> =
      [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: null,
            ok: true,
            remaining: null,
            used: 1,
          };
        },
      },
    });

    const response = await request(app, "/api/analyze", {
      body: JSON.stringify({ text: "I was wondering if you could help me." }),
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.10, 10.0.0.1",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.userId).toBeNull();
    expect(identities[0]?.ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not trust spoofed forwarded IP headers by default", async () => {
    const identities: Array<{ ipHash: string | null; userId: string | null }> =
      [];
    const app = createApp({
      analyzeService: analysisService,
      analysisUsageService: {
        consume: async (identity) => {
          identities.push(identity);

          return {
            limit: null,
            ok: true,
            remaining: null,
            used: identities.length,
          };
        },
      },
      usageIpHashSalt: "test-salt",
    });

    for (const forwardedFor of ["203.0.113.10", "198.51.100.20"]) {
      const response = await request(app, "/api/analyze", {
        body: JSON.stringify({ text: "I was wondering if you could help me." }),
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": forwardedFor,
        },
        method: "POST",
      });

      expect(response.status).toBe(200);
    }

    expect(identities).toHaveLength(2);
    expect(identities[0]?.ipHash).toBe(identities[1]?.ipHash);
  });
});
