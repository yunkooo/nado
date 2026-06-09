type MobileApiProcessEnv = {
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_NADO_API_BASE_URL?: string;
};

declare const process: { env: MobileApiProcessEnv };

export type MobileApiPlatform = "android" | "ios" | "web" | "windows" | "macos";

type ResolveMobileApiUrlOptions = {
  platform?: MobileApiPlatform | string;
};

const IOS_SIMULATOR_API_BASE_URL = "http://localhost:4000";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:4000";

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
    return normalizedPath;
  }

  return `${trimmedBaseUrl.replace(/\/+$/, "")}${normalizedPath}`;
}

function readDefaultMobileApiBaseUrl(platform: string | undefined = "ios") {
  if (platform === "android") {
    return ANDROID_EMULATOR_API_BASE_URL;
  }

  if (platform === "web") {
    return "";
  }

  return IOS_SIMULATOR_API_BASE_URL;
}
