import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

const app = createApp();

describe("createApp CORS", () => {
  it("allows Expo mobile web clients to call API routes", async () => {
    const response = await request(app, "/api/analyze", {
      headers: {
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:8081",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8081",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST",
    );
  });

  it("allows Tauri desktop clients to call API routes", async () => {
    for (const origin of [
      "tauri://localhost",
      "http://tauri.localhost",
      "https://tauri.localhost",
    ]) {
      const response = await request(app, "/api/vocabulary", {
        headers: {
          "Access-Control-Request-Headers": "authorization",
          "Access-Control-Request-Method": "GET",
          Origin: origin,
        },
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "Authorization",
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
    }
  });

  it("does not allow localhost CORS when local origins are disabled", async () => {
    const app = createApp({
      allowLocalCors: false,
      analyzeService: analysisService,
    });
    const response = await request(app, "/api/analyze", {
      headers: {
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:3000",
      },
      method: "OPTIONS",
    });

    expect(response.status).not.toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
