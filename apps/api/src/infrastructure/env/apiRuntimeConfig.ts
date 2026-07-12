import { MAX_ANALYSIS_DAILY_LIMIT } from "../../features/analysis/config/analysisLimits.js";

export type ApiRuntimeEnvironment = Record<string, string | undefined>;

const LOCAL_USAGE_IP_HASH_SALT = "nado-local-dev";
const MINIMUM_PRODUCTION_SALT_LENGTH = 32;
const DEFAULT_API_PORT = 4000;
const MAXIMUM_TRUSTED_PROXY_HOPS = 10;

export class ApiRuntimeConfigurationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(`Invalid API runtime configuration: ${issues.join(", ")}`);
    this.name = "ApiRuntimeConfigurationError";
    this.issues = issues;
  }
}

export function validateApiRuntimeConfig(
  environment: ApiRuntimeEnvironment = process.env,
): void {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  const issues = [
    ...requiredValueIssues(environment, [
      "OPENAI_API_KEY",
      "OPENROUTER_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
    ]),
    ...positiveIntegerIssues(environment, [
      "OPENAI_TIMEOUT_MS",
      "OPENROUTER_TIMEOUT_MS",
    ]),
    ...requiredPositiveIntegerIssues(environment, [
      "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT",
    ]),
    ...corsOriginIssues(environment.NADO_CORS_ORIGINS),
    ...supabaseUrlIssues(environment.SUPABASE_URL),
    ...usageIpHashSaltIssues(environment.NADO_USAGE_IP_HASH_SALT),
    ...trustProxyIssues(environment.NADO_TRUST_PROXY),
  ];

  if (issues.length > 0) {
    throw new ApiRuntimeConfigurationError(issues);
  }
}

export function resolveApiPort(
  environment: ApiRuntimeEnvironment = process.env,
): number {
  const configuredPort =
    environment.NADO_API_PORT ?? environment.PORT ?? String(DEFAULT_API_PORT);

  if (!/^\d+$/.test(configuredPort.trim())) {
    throw invalidPortConfigurationError();
  }

  const port = Number(configuredPort);

  if (port < 1 || port > 65_535) {
    throw invalidPortConfigurationError();
  }

  return port;
}

export function resolveUsageIpHashSalt(
  environment: ApiRuntimeEnvironment = process.env,
): string {
  const configuredSalt = environment.NADO_USAGE_IP_HASH_SALT?.trim();

  if (configuredSalt) {
    return configuredSalt;
  }

  if (environment.NODE_ENV === "production") {
    throw new ApiRuntimeConfigurationError([
      "NADO_USAGE_IP_HASH_SALT is required in production",
    ]);
  }

  return LOCAL_USAGE_IP_HASH_SALT;
}

function requiredValueIssues(
  environment: ApiRuntimeEnvironment,
  names: string[],
): string[] {
  return names.flatMap((name) =>
    environment[name]?.trim() ? [] : [`${name} is required in production`],
  );
}

function positiveIntegerIssues(
  environment: ApiRuntimeEnvironment,
  names: string[],
): string[] {
  return names.flatMap((name) => {
    const value = environment[name];

    if (value === undefined || value.trim() === "") {
      return [];
    }

    const parsedValue = Number(value);

    return /^\d+$/.test(value.trim()) &&
      Number.isSafeInteger(parsedValue) &&
      parsedValue > 0
      ? []
      : [`${name} must be a positive integer`];
  });
}

function requiredPositiveIntegerIssues(
  environment: ApiRuntimeEnvironment,
  names: string[],
): string[] {
  return names.flatMap((name) => {
    const value = environment[name]?.trim() ?? "";

    if (!value) {
      return [`${name} is required in production`];
    }

    const parsedValue = Number(value);

    return /^\d+$/.test(value) &&
      Number.isSafeInteger(parsedValue) &&
      parsedValue > 0 &&
      parsedValue <= MAX_ANALYSIS_DAILY_LIMIT
      ? []
      : [
          `${name} must be a positive integer no greater than ${MAX_ANALYSIS_DAILY_LIMIT}`,
        ];
  });
}

function corsOriginIssues(value: string | undefined): string[] {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return ["NADO_CORS_ORIGINS is required in production"];
  }

  return origins.flatMap((origin) => {
    try {
      const url = new URL(origin);
      const isExactHttpsOrigin =
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        origin === url.origin;

      return isExactHttpsOrigin
        ? []
        : [`NADO_CORS_ORIGINS entry must be an exact HTTPS origin: ${origin}`];
    } catch {
      return [`NADO_CORS_ORIGINS entry must be a valid URL: ${origin}`];
    }
  });
}

function invalidPortConfigurationError() {
  return new ApiRuntimeConfigurationError([
    "NADO_API_PORT or PORT must be an integer between 1 and 65535",
  ]);
}

function supabaseUrlIssues(value: string | undefined): string[] {
  const configuredUrl = value?.trim() ?? "";

  if (!configuredUrl) {
    return [];
  }

  try {
    const url = new URL(configuredUrl);
    const isHttpsOrigin =
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      (url.pathname === "" || url.pathname === "/") &&
      url.search === "" &&
      url.hash === "";

    return isHttpsOrigin
      ? []
      : [
          "SUPABASE_URL must be an HTTPS origin without credentials, path, query, or fragment",
        ];
  } catch {
    return ["SUPABASE_URL must be a valid HTTPS origin"];
  }
}

function usageIpHashSaltIssues(value: string | undefined): string[] {
  const salt = value?.trim() ?? "";

  if (!salt) {
    return ["NADO_USAGE_IP_HASH_SALT is required in production"];
  }

  if (salt === LOCAL_USAGE_IP_HASH_SALT) {
    return ["NADO_USAGE_IP_HASH_SALT must not use the local development value"];
  }

  if (salt.length < MINIMUM_PRODUCTION_SALT_LENGTH) {
    return [
      `NADO_USAGE_IP_HASH_SALT must contain at least ${MINIMUM_PRODUCTION_SALT_LENGTH} characters`,
    ];
  }

  return [];
}

function trustProxyIssues(value: string | undefined): string[] {
  const configuredHops = value?.trim() ?? "";

  if (!configuredHops) {
    return ["NADO_TRUST_PROXY is required in production"];
  }

  if (!/^[1-9]\d*$/.test(configuredHops)) {
    return ["NADO_TRUST_PROXY must be a positive proxy hop count"];
  }

  const proxyHops = Number(configuredHops);

  if (
    !Number.isSafeInteger(proxyHops) ||
    proxyHops < 1 ||
    proxyHops > MAXIMUM_TRUSTED_PROXY_HOPS
  ) {
    return [
      `NADO_TRUST_PROXY must be between 1 and ${MAXIMUM_TRUSTED_PROXY_HOPS}`,
    ];
  }

  return [];
}
