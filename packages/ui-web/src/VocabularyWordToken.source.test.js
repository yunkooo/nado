import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokenSource = readFileSync(
  new URL("./VocabularyWordToken.tsx", import.meta.url),
  "utf8",
);
const interactionSource = readFileSync(
  new URL("./useVocabularyWordPopover.ts", import.meta.url),
  "utf8",
);
const popoverSource = readFileSync(
  new URL("./VocabularyWordPopover.tsx", import.meta.url),
  "utf8",
);
const source = [tokenSource, interactionSource, popoverSource].join("\n");

describe("VocabularyWordToken interaction source", () => {
  it("delegates interaction state and the portaled view to stable boundaries", () => {
    expect(tokenSource.split("\n").length).toBeLessThanOrEqual(300);
    expect(tokenSource).toContain("useVocabularyWordPopover");
    expect(tokenSource).toContain("<VocabularyWordPopover");
    expect(tokenSource).not.toContain("document.addEventListener");
    expect(interactionSource).toContain("document.addEventListener");
  });

  it("keeps fixed popovers reachable while crossing the trigger gap", () => {
    expect(source).toContain("WORD_POPOVER_CLOSE_DELAY_MS");
    expect(source).toContain("clearHoverCloseDelay");
    expect(source).toContain("closeHoverWithDelay");
    expect(source).toContain("onPointerEnter={interaction.openHover}");
    expect(source).toContain(
      "onPointerLeave={interaction.closeHoverWithDelay}",
    );
  });

  it("renders fixed popovers outside container query workspaces", () => {
    expect(source).toContain('import { createPortal } from "react-dom"');
    expect(source).toContain("setPopoverRoot(document.body)");
    expect(source).toContain("nado-word-popover--open");
    expect(source).toContain("createPortal(popover, interaction.popoverRoot)");
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

  it("closes interaction-open popovers after a vocabulary save completes", () => {
    expect(source).toContain("previousSaveStateRef");
    expect(source).toContain("closeInteractionPopover");
    expect(source).toContain(
      'previousSaveState !== "saved" && state === "saved"',
    );
  });

  it("keeps keyboard tab access to the portaled save button", () => {
    expect(source).toContain("focusPopoverSaveButton");
    expect(source).toContain("handleTokenKeyDown");
    expect(source).toContain("handleSaveButtonKeyDown");
    expect(source).toContain('event.key !== "Tab" || event.shiftKey');
    expect(source).toContain(".nado-word-popover__save:not(:disabled)");
  });
});
