import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_DAILY_LIMIT } from "../../features/analysis/config/analysisLimits.js";
import {
  ApiRuntimeConfigurationError,
  resolveApiPort,
  resolveUsageIpHashSalt,
  validateApiRuntimeConfig,
} from "./apiRuntimeConfig.js";

const validProductionEnvironment = {
  NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT: "3",
  NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT: "20",
  NADO_CORS_ORIGINS: "https://nado.example.com",
  NADO_TRUST_PROXY: "1",
  NADO_USAGE_IP_HASH_SALT:
    "a-secure-production-salt-with-more-than-32-characters",
  NODE_ENV: "production",
  OPENAI_API_KEY: "openai-key",
  OPENROUTER_API_KEY: "openrouter-key",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  SUPABASE_URL: "https://project.supabase.co",
};

describe("API runtime configuration", () => {
  it("allows missing server credentials outside production", () => {
    expect(() =>
      validateApiRuntimeConfig({ NODE_ENV: "development" }),
    ).not.toThrow();
    expect(resolveUsageIpHashSalt({ NODE_ENV: "development" })).toBe(
      "nado-local-dev",
    );
  });

  it("accepts complete production configuration", () => {
    expect(() =>
      validateApiRuntimeConfig(validProductionEnvironment),
    ).not.toThrow();
    expect(resolveUsageIpHashSalt(validProductionEnvironment)).toBe(
      validProductionEnvironment.NADO_USAGE_IP_HASH_SALT,
    );
  });

  it("rejects missing production credentials before the server starts", () => {
    expect(() => validateApiRuntimeConfig({ NODE_ENV: "production" })).toThrow(
      ApiRuntimeConfigurationError,
    );

    try {
      validateApiRuntimeConfig({ NODE_ENV: "production" });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRuntimeConfigurationError);
      expect((error as ApiRuntimeConfigurationError).issues).toEqual(
        expect.arrayContaining([
          "OPENAI_API_KEY is required in production",
          "OPENROUTER_API_KEY is required in production",
          "SUPABASE_ANON_KEY is required in production",
          "SUPABASE_SERVICE_ROLE_KEY is required in production",
          "SUPABASE_URL is required in production",
          "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT is required in production",
          "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT is required in production",
          "NADO_CORS_ORIGINS is required in production",
          "NADO_USAGE_IP_HASH_SALT is required in production",
          "NADO_TRUST_PROXY is required in production",
        ]),
      );
    }
  });

  it("rejects predictable or short production salts", () => {
    for (const salt of ["nado-local-dev", "too-short"]) {
      expect(() =>
        validateApiRuntimeConfig({
          ...validProductionEnvironment,
          NADO_USAGE_IP_HASH_SALT: salt,
        }),
      ).toThrow(ApiRuntimeConfigurationError);
    }
  });

  it("rejects invalid production timeout and usage limit values", () => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT: "unlimited",
        OPENAI_TIMEOUT_MS: "0",
        SUPABASE_TIMEOUT_MS: "10.5",
      }),
    ).toThrow(
      expect.objectContaining({
        issues: [
          "OPENAI_TIMEOUT_MS must be a positive integer",
          "SUPABASE_TIMEOUT_MS must be a positive integer",
          `NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT must be a non-negative integer no greater than ${MAX_ANALYSIS_DAILY_LIMIT}`,
        ],
      }),
    );
  });

  it.each(["01", "true", "all", "11", "-1"])(
    "rejects unsafe production trust proxy value %s",
    (trustProxy) => {
      expect(() =>
        validateApiRuntimeConfig({
          ...validProductionEnvironment,
          NADO_TRUST_PROXY: trustProxy,
        }),
      ).toThrow(ApiRuntimeConfigurationError);
    },
  );

  it.each(["0", "false", " FALSE "])(
    "accepts disabled production proxy trust value %s",
    (trustProxy) => {
      expect(() =>
        validateApiRuntimeConfig({
          ...validProductionEnvironment,
          NADO_TRUST_PROXY: trustProxy,
        }),
      ).not.toThrow();
    },
  );

  it.each([
    "",
    "-1",
    "10.5",
    "unlimited",
    String(MAX_ANALYSIS_DAILY_LIMIT + 1),
  ])("rejects unsafe production usage limit %s", (limit) => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT: limit,
      }),
    ).toThrow(ApiRuntimeConfigurationError);
  });

  it.each([
    "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
    "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT",
  ] as const)("accepts zero for production usage limit %s", (name) => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        [name]: "0",
      }),
    ).not.toThrow();
  });

  it.each([
    "http://nado.example.com",
    "https://nado.example.com/",
    "https://nado.example.com/path",
    "*",
    "not-a-url",
  ])("rejects invalid production CORS origin %s", (corsOrigin) => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        NADO_CORS_ORIGINS: corsOrigin,
      }),
    ).toThrow(ApiRuntimeConfigurationError);
  });

  it("accepts multiple exact HTTPS production CORS origins", () => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        NADO_CORS_ORIGINS:
          "https://nado.example.com, https://preview.nado.example.com",
      }),
    ).not.toThrow();
  });

  it.each([
    "http://project.supabase.co",
    "https://project.supabase.co/rest/v1",
    "https://user:password@project.supabase.co",
    "https://project.supabase.co?debug=true",
    "not-a-url",
  ])("rejects unsafe production Supabase URL %s", (supabaseUrl) => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        SUPABASE_URL: supabaseUrl,
      }),
    ).toThrow(ApiRuntimeConfigurationError);
  });

  it("accepts a production Supabase HTTPS origin with a trailing slash", () => {
    expect(() =>
      validateApiRuntimeConfig({
        ...validProductionEnvironment,
        SUPABASE_URL: "https://project.supabase.co/",
      }),
    ).not.toThrow();
  });

  it.each(["1", "2", "10"])(
    "accepts explicit production proxy hop count %s",
    (trustProxy) => {
      expect(() =>
        validateApiRuntimeConfig({
          ...validProductionEnvironment,
          NADO_TRUST_PROXY: trustProxy,
        }),
      ).not.toThrow();
    },
  );

  it("resolves and validates the API listen port", () => {
    expect(resolveApiPort({})).toBe(4000);
    expect(resolveApiPort({ PORT: "8080" })).toBe(8080);
    expect(resolveApiPort({ NADO_API_PORT: "4001", PORT: "8080" })).toBe(4001);
    expect(() => resolveApiPort({ PORT: "0" })).toThrow(
      ApiRuntimeConfigurationError,
    );
    expect(() => resolveApiPort({ PORT: "not-a-port" })).toThrow(
      ApiRuntimeConfigurationError,
    );
  });
});
