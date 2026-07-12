import { describe, expect, it } from "vitest";
import { getMobileWordPopoverPosition } from "./wordPopoverPlacement";

describe("getMobileWordPopoverPosition", () => {
  const viewportSize = {
    height: 720,
    width: 390,
  };

  const popoverSize = {
    height: 180,
    width: 320,
  };

  it("places the word popover above the selected word by default", () => {
    const position = getMobileWordPopoverPosition({
      popoverSize,
      triggerRect: {
        height: 28,
        width: 86,
        x: 170,
        y: 360,
      },
      viewportSize,
    });

    expect(position.placement).toBe("top");
    expect(position.top + position.height).toBeLessThanOrEqual(356);
    expect(position.left).toBeGreaterThanOrEqual(12);
    expect(position.left + position.width).toBeLessThanOrEqual(378);
  });

  it("flips below the selected word when the top side would be clipped", () => {
    const position = getMobileWordPopoverPosition({
      popoverSize,
      triggerRect: {
        height: 28,
        width: 86,
        x: 24,
        y: 42,
      },
      viewportSize,
    });

    expect(position).toMatchObject({
      placement: "bottom",
      top: 74,
    });
  });

  it("keeps the popover within the mobile viewport on narrow screens", () => {
    const position = getMobileWordPopoverPosition({
      popoverSize: {
        height: 180,
        width: 320,
      },
      triggerRect: {
        height: 28,
        width: 72,
        x: 326,
        y: 360,
      },
      viewportSize,
    });

    expect(position.width).toBe(320);
    expect(position.left + position.width).toBeLessThanOrEqual(378);
  });

  it("recomputes the clamped position when the viewport rotates", () => {
    const triggerRect = {
      height: 28,
      width: 72,
      x: 326,
      y: 360,
    };
    const portrait = getMobileWordPopoverPosition({
      popoverSize,
      triggerRect,
      viewportSize: { height: 720, width: 390 },
    });
    const landscape = getMobileWordPopoverPosition({
      popoverSize,
      triggerRect,
      viewportSize: { height: 390, width: 720 },
    });

    expect(portrait.left).not.toBe(landscape.left);
    expect(landscape.top + landscape.height).toBeLessThanOrEqual(378);
    expect(landscape.left + landscape.width).toBeLessThanOrEqual(708);
  });
});
