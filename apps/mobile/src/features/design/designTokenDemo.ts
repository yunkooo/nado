export function isMobileDesignDemoFlagEnabled(value: string | undefined) {
  return value === "1";
}

export function readMobileDesignDemoEnabled() {
  return isMobileDesignDemoFlagEnabled(
    process.env.EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO,
  );
}
