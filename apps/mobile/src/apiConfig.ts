type MobileApiProcessEnv = {
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_NADO_API_BASE_URL?: string;
  NODE_ENV?: string;
};

declare const process: { env: MobileApiProcessEnv };
declare const __DEV__: boolean | undefined;

export type MobileApiPlatform = "android" | "ios" | "web" | "windows" | "macos";

type ResolveMobileApiUrlOptions = {
  platform?: MobileApiPlatform | string;
};

const IOS_SIMULATOR_API_BASE_URL = "http://localhost:4000";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:4000";
export const MOBILE_API_CONFIGURATION_ERROR_MESSAGE =
  "API 서버 주소가 설정되지 않았어요. 모바일 실행 환경변수를 확인해 주세요.";

export class MobileApiConfigurationError extends Error {
  constructor() {
    super(MOBILE_API_CONFIGURATION_ERROR_MESSAGE);
    this.name = "MobileApiConfigurationError";
  }
}

export function readMobileApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_NADO_API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_BASE_URL
  );
}

export function resolveMobileApiUrl(
  path: string,
  apiBaseUrl: string | undefined = readMobileApiBaseUrl(),
  options: ResolveMobileApiUrlOptions = {},
) {
  const trimmedBaseUrl =
    apiBaseUrl?.trim() || readDefaultMobileApiBaseUrl(options.platform);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!trimmedBaseUrl) {
    if (options.platform === "web") {
      return normalizedPath;
    }

    throw new MobileApiConfigurationError();
  }

  if (trimmedBaseUrl === "relative") {
    return normalizedPath;
  }

  return `${trimmedBaseUrl.replace(/\/+$/, "")}${normalizedPath}`;
}

function readDefaultMobileApiBaseUrl(platform: string | undefined = "ios") {
  if (platform === "web") {
    return "relative";
  }

  if (!isDevelopmentRuntime()) {
    return "";
  }

  if (platform === "android") {
    return ANDROID_EMULATOR_API_BASE_URL;
  }

  return IOS_SIMULATOR_API_BASE_URL;
}

function isDevelopmentRuntime() {
  if (typeof __DEV__ === "boolean") {
    return __DEV__;
  }

  return process.env.NODE_ENV !== "production";
}
