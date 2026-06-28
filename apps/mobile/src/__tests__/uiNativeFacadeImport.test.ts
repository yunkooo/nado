import { describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => ({
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

vi.mock("react-native", () => nativeMocks);

describe("mobile @nado/ui/native import contract", () => {
  it("resolves the native facade without importing the cross-platform root entry", async () => {
    const nativeFacade = await import("@nado/ui/native");

    expect(nativeFacade.Button).toBeTypeOf("function");
    expect(nativeFacade.Card).toBeTypeOf("function");
    expect(nativeFacade.Stack).toBeTypeOf("function");
    expect(nativeFacade.Text).toBeTypeOf("function");
  });
});
