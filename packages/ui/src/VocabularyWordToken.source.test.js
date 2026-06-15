import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./VocabularyWordToken.tsx", import.meta.url),
  "utf8",
);

describe("VocabularyWordToken interaction source", () => {
  it("keeps fixed popovers reachable while crossing the trigger gap", () => {
    expect(source).toContain("WORD_POPOVER_CLOSE_DELAY_MS");
    expect(source).toContain("clearHoverCloseDelay");
    expect(source).toContain("closeHoverWithDelay");
    expect(source).toContain("onPointerEnter={openHover}");
    expect(source).toContain("onPointerLeave={closeHoverWithDelay}");
  });

  it("renders fixed popovers outside container query workspaces", () => {
    expect(source).toContain('import { createPortal } from "react-dom"');
    expect(source).toContain("setPopoverRoot(document.body)");
    expect(source).toContain("nado-word-popover--open");
    expect(source).toContain("createPortal(popover, popoverRoot)");
  });

  it("does not keep popovers open from pointer focus alone", () => {
    expect(source).toContain("isPointerFocusRef");
    expect(source).toContain("openFocusFromKeyboard");
    expect(source).toContain("onPointerDownCapture");
  });

  it("keeps touch tap popovers open until the user leaves that popover", () => {
    expect(source).toContain("isTapOpen");
    expect(source).toContain("openTap");
    expect(source).toContain("closeTapOpen");
    expect(source).toContain(
      "shouldSuppressFocusFromPointer(event.pointerType)",
    );
  });
});
