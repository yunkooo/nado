import type { CSSProperties } from "react";

const WORD_POPOVER_MARGIN = 12;
const WORD_POPOVER_GAP = 4;
const WORD_POPOVER_WIDTH = 220;

export type RectLike = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type SizeLike = {
  height: number;
  width: number;
};

export type ViewportSize = {
  height: number;
  width: number;
};

export type WordPopoverPlacement = "bottom" | "top";

export type WordPopoverPosition = {
  height: number;
  left: number;
  placement: WordPopoverPlacement;
  top: number;
  width: number;
};

export type WordPopoverPositionOptions = {
  popoverSize: SizeLike;
  scrollportRect: RectLike;
  triggerRect: RectLike;
  viewportSize: ViewportSize;
};

type WordPopoverStyle = CSSProperties & {
  "--nado-word-popover-height"?: string;
  "--nado-word-popover-left"?: string;
  "--nado-word-popover-top"?: string;
  "--nado-word-popover-width"?: string;
};

export function getClampedWordPopoverPosition({
  popoverSize,
  scrollportRect,
  triggerRect,
  viewportSize,
}: WordPopoverPositionOptions): WordPopoverPosition {
  const leftBoundary = Math.max(scrollportRect.left, 0) + WORD_POPOVER_MARGIN;
  const rightBoundary =
    Math.min(scrollportRect.right, viewportSize.width) - WORD_POPOVER_MARGIN;
  const topBoundary = Math.max(scrollportRect.top, 0) + WORD_POPOVER_MARGIN;
  const bottomBoundary =
    Math.min(scrollportRect.bottom, viewportSize.height) - WORD_POPOVER_MARGIN;
  const availableWidth = Math.max(0, rightBoundary - leftBoundary);
  const width = Math.min(popoverSize.width, availableWidth);
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const maxLeft = Math.max(leftBoundary, rightBoundary - width);
  const left = clamp(triggerCenter - width / 2, leftBoundary, maxLeft);
  const availableHeight = Math.max(0, bottomBoundary - topBoundary);
  const height = Math.min(popoverSize.height, availableHeight);
  const topPlacementTop = triggerRect.top - WORD_POPOVER_GAP - height;
  const bottomPlacementTop = triggerRect.bottom + WORD_POPOVER_GAP;
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

export function createWordPopoverStyle(
  position: WordPopoverPosition | null,
): WordPopoverStyle | undefined {
  if (!position) {
    return undefined;
  }

  return {
    "--nado-word-popover-height": `${Math.round(position.height)}px`,
    "--nado-word-popover-left": `${Math.round(position.left)}px`,
    "--nado-word-popover-top": `${Math.round(position.top)}px`,
    "--nado-word-popover-width": `${Math.round(position.width)}px`,
  };
}

export function getNearestScrollportRect(element: HTMLElement): RectLike {
  let currentElement = element.parentElement;

  while (currentElement) {
    const style = window.getComputedStyle(currentElement);

    if (
      isScrollableOverflow(style.overflowX) ||
      isScrollableOverflow(style.overflowY)
    ) {
      return toRectLike(currentElement.getBoundingClientRect());
    }

    currentElement = currentElement.parentElement;
  }

  return {
    bottom: window.innerHeight,
    height: window.innerHeight,
    left: 0,
    right: window.innerWidth,
    top: 0,
    width: window.innerWidth,
  };
}

export function getWordPopoverSize(popover: HTMLElement): SizeLike {
  const rect = popover.getBoundingClientRect();

  return {
    height: Math.max(rect.height, popover.scrollHeight),
    width: WORD_POPOVER_WIDTH,
  };
}

export function toRectLike(rect: DOMRect): RectLike {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function areWordPopoverPositionsEqual(
  currentPosition: WordPopoverPosition | null,
  nextPosition: WordPopoverPosition,
) {
  return (
    currentPosition?.left === nextPosition.left &&
    currentPosition.height === nextPosition.height &&
    currentPosition.placement === nextPosition.placement &&
    currentPosition.top === nextPosition.top &&
    currentPosition.width === nextPosition.width
  );
}

function isScrollableOverflow(value: string) {
  return (
    value === "auto" ||
    value === "scroll" ||
    value === "hidden" ||
    value === "clip"
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
