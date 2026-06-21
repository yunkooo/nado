const MOBILE_WORD_POPOVER_MARGIN = 12;
const MOBILE_WORD_POPOVER_GAP = 4;

export const MOBILE_WORD_POPOVER_DEFAULT_HEIGHT = 180;
export const MOBILE_WORD_POPOVER_DEFAULT_WIDTH = 320;

export type MobileWordPopoverPlacement = "bottom" | "top";

export type MobileWordPopoverRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type MobileWordPopoverSize = {
  height: number;
  width: number;
};

export type MobileWordPopoverViewportSize = {
  height: number;
  width: number;
};

export type MobileWordPopoverPosition = {
  height: number;
  left: number;
  placement: MobileWordPopoverPlacement;
  top: number;
  width: number;
};

export function getMobileWordPopoverPosition({
  popoverSize,
  triggerRect,
  viewportSize,
}: {
  popoverSize: MobileWordPopoverSize;
  triggerRect: MobileWordPopoverRect;
  viewportSize: MobileWordPopoverViewportSize;
}): MobileWordPopoverPosition {
  const leftBoundary = MOBILE_WORD_POPOVER_MARGIN;
  const rightBoundary = viewportSize.width - MOBILE_WORD_POPOVER_MARGIN;
  const topBoundary = MOBILE_WORD_POPOVER_MARGIN;
  const bottomBoundary = viewportSize.height - MOBILE_WORD_POPOVER_MARGIN;
  const availableWidth = Math.max(0, rightBoundary - leftBoundary);
  const width = Math.min(popoverSize.width, availableWidth);
  const triggerCenter = triggerRect.x + triggerRect.width / 2;
  const maxLeft = Math.max(leftBoundary, rightBoundary - width);
  const left = clamp(triggerCenter - width / 2, leftBoundary, maxLeft);
  const availableHeight = Math.max(0, bottomBoundary - topBoundary);
  const height = Math.min(popoverSize.height, availableHeight);
  const topPlacementTop = triggerRect.y - MOBILE_WORD_POPOVER_GAP - height;
  const bottomPlacementTop =
    triggerRect.y + triggerRect.height + MOBILE_WORD_POPOVER_GAP;
  const shouldFlipToBottom =
    topPlacementTop < topBoundary &&
    bottomPlacementTop + height <= bottomBoundary;

  if (shouldFlipToBottom) {
    return {
      height,
      left,
      placement: "bottom",
      top: bottomPlacementTop,
      width,
    };
  }

  return {
    height,
    left,
    placement: "top",
    top: clamp(
      topPlacementTop,
      topBoundary,
      Math.max(topBoundary, bottomBoundary - height),
    ),
    width,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
