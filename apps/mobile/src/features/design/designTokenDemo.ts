const mobileTokenParityDemoSections = [
  {
    description:
      "primary와 surfaceMuted 색상이 React Native 화면까지 같은 token source에서 이어지는지 확인합니다.",
    tokenSources: [
      "nativeTokens.color.primary",
      "nativeTokens.color.surfaceMuted",
    ],
    title: "Primary color",
  },
  {
    description:
      "primary, secondary, send, md, icon button contract가 component token을 통과하는지 확인합니다.",
    tokenSources: [
      "nativeTokens.component.button.primary",
      "nativeTokens.component.button.secondary",
      "nativeTokens.component.button.send",
      "nativeTokens.component.button.size.md",
      "nativeTokens.component.button.size.icon",
    ],
    title: "Button contract",
  },
] as const;

export function isMobileDesignDemoFlagEnabled(value: string | undefined) {
  return value === "1";
}

export function readMobileDesignDemoEnabled() {
  return isMobileDesignDemoFlagEnabled(
    process.env.EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO,
  );
}

export function getMobileTokenParityDemoSections() {
  return mobileTokenParityDemoSections;
}
