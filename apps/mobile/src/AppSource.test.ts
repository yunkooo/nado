import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const authClientSource = readFileSync(
  new URL("./authClient.ts", import.meta.url),
  "utf8",
);
const authStateSource = readFileSync(
  new URL("./authState.ts", import.meta.url),
  "utf8",
);

describe("mobile App API wiring", () => {
  it("submits analysis text through the mobile analyze API client", () => {
    expect(appSource).toContain("analyzeText");
    expect(appSource).toContain('setAnalysisState({ status: "loading" })');
    expect(appSource).toContain("await analyzeText");
    expect(appSource).toContain('setText("")');
  });

  it("uses the shared mobile API base URL for configured backends", () => {
    expect(appSource).toContain("readMobileApiBaseUrl");
    expect(appSource).toContain("configuredMobileApiBaseUrl");
  });

  it("connects login and vocabulary screens to real services", () => {
    expect(appSource).toContain("useMobileAuthState");
    expect(appSource).toContain("signInWithGoogle");
    expect(appSource).toContain("signOut");
    expect(appSource).toContain("useMobileVocabulary");
    expect(appSource).not.toContain("mobileVocabularyItems.map");
    expect(appSource).not.toContain("mobileReviewCards");
  });

  it("configures Supabase auth for React Native session persistence and callbacks", () => {
    expect(authClientSource).toContain(
      "@react-native-async-storage/async-storage",
    );
    expect(authClientSource).toContain("react-native-url-polyfill/auto");
    expect(authClientSource).toContain("storage: AsyncStorage");
    expect(authClientSource).toContain("detectSessionInUrl: false");
    expect(authClientSource).toContain("skipBrowserRedirect");
    expect(authClientSource).toContain("completeMobileAuthFromCallbackUrl");
    expect(authStateSource).toContain("Linking.getInitialURL");
    expect(authStateSource).toContain('Linking.addEventListener("url"');
  });
});
