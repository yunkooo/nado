export const MOBILE_DESIGN_DEMO_FLAG = "EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO";

export function readMobileDesignDemoEnabled(
  env: Partial<Record<string, string | undefined>> = process.env,
) {
  return env[MOBILE_DESIGN_DEMO_FLAG] === "1";
}
