import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  VocabularyItem,
  VocabularySuggestion,
  VocabularySuggestionSaveState,
} from "./analysisTypes";

const WORD_POPOVER_MARGIN = 12;
const WORD_POPOVER_GAP = 4;
const WORD_POPOVER_WIDTH = 220;
const WORD_POPOVER_CLOSE_DELAY_MS = 120;

type RectLike = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type SizeLike = {
  height: number;
  width: number;
};

type ViewportSize = {
  height: number;
  width: number;
};

export type WordPopoverPlacement = "bottom" | "top";

export type WordPopoverPosition = {
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

export interface VocabularyWordTokenProps {
  getVocabularySuggestionState?: (
    suggestion: VocabularySuggestion,
  ) => VocabularySuggestionSaveState;
  isOpen?: boolean;
  item: VocabularyItem;
  onSaveVocabularySuggestion?: (suggestion: VocabularySuggestion) => void;
  text: string;
}

export function VocabularyWordToken({
  getVocabularySuggestionState,
  isOpen = false,
  item,
  onSaveVocabularySuggestion,
  text,
}: VocabularyWordTokenProps) {
  const state = getVocabularySuggestionState?.(item) ?? "idle";
  const canSave = Boolean(onSaveVocabularySuggestion);
  const [isHovering, setIsHovering] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [popoverPosition, setPopoverPosition] =
    useState<WordPopoverPosition | null>(null);
  const [popoverRoot, setPopoverRoot] = useState<HTMLElement | null>(null);
  const hoverCloseDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerFocusRef = useRef(false);
  const tokenRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const isPopoverOpen = isOpen || isHovering || hasFocusWithin;

  const clearHoverCloseDelay = useCallback(() => {
    if (hoverCloseDelayRef.current === null) {
      return;
    }

    clearTimeout(hoverCloseDelayRef.current);
    hoverCloseDelayRef.current = null;
  }, []);

  const openHover = useCallback(() => {
    clearHoverCloseDelay();
    setIsHovering(true);
  }, [clearHoverCloseDelay]);

  const closeHoverWithDelay = useCallback(() => {
    clearHoverCloseDelay();

    hoverCloseDelayRef.current = setTimeout(() => {
      setIsHovering(false);
      hoverCloseDelayRef.current = null;
    }, WORD_POPOVER_CLOSE_DELAY_MS);
  }, [clearHoverCloseDelay]);

  const trackPointerFocus = useCallback(() => {
    isPointerFocusRef.current = true;
    setHasFocusWithin(false);

    window.setTimeout(() => {
      isPointerFocusRef.current = false;
    }, 0);
  }, []);

  const openFocusFromKeyboard = useCallback(() => {
    if (isPointerFocusRef.current) {
      isPointerFocusRef.current = false;
      setHasFocusWithin(false);
      return;
    }

    setHasFocusWithin(true);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!isPopoverOpen || typeof window === "undefined") {
      return;
    }

    const token = tokenRef.current;
    const popover = popoverRef.current;

    if (!token || !popover) {
      return;
    }

    const nextPosition = getClampedWordPopoverPosition({
      popoverSize: getWordPopoverSize(popover),
      scrollportRect: getNearestScrollportRect(token),
      triggerRect: toRectLike(token.getBoundingClientRect()),
      viewportSize: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    });
    setPopoverPosition((currentPosition) =>
      areWordPopoverPositionsEqual(currentPosition, nextPosition)
        ? currentPosition
        : nextPosition,
    );
  }, [isPopoverOpen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setPopoverRoot(document.body);
  }, []);

  const containsPopoverFocusTarget = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return false;
      }

      return (
        Boolean(tokenRef.current?.contains(target)) ||
        Boolean(popoverRef.current?.contains(target))
      );
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    if (!isPopoverOpen) {
      setPopoverPosition(null);
      return;
    }

    updatePopoverPosition();
  }, [
    canSave,
    isPopoverOpen,
    item.contextMeaning,
    item.meaning,
    item.partOfSpeech,
    item.term,
    popoverRoot,
    popoverPosition?.width,
    state,
    updatePopoverPosition,
  ]);

  useIsomorphicLayoutEffect(() => {
    if (!isPopoverOpen || typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isPopoverOpen, updatePopoverPosition]);

  useEffect(() => clearHoverCloseDelay, [clearHoverCloseDelay]);

  const popoverStyle = createWordPopoverStyle(popoverPosition);
  const popover = (
    <span
      aria-label={`${item.term} 뜻과 저장 액션`}
      className={[
        "nado-word-popover",
        isPopoverOpen ? "nado-word-popover--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      data-placement={popoverPosition?.placement ?? "top"}
      onBlurCapture={(event) => {
        if (containsPopoverFocusTarget(event.relatedTarget)) {
          return;
        }

        setHasFocusWithin(false);
      }}
      onFocusCapture={() => {
        openFocusFromKeyboard();
      }}
      onPointerDownCapture={trackPointerFocus}
      onPointerEnter={openHover}
      onPointerLeave={closeHoverWithDelay}
      ref={popoverRef}
      role="group"
      style={popoverStyle}
    >
      <span className="nado-word-popover__header">
        <strong>{item.term}</strong>
        {item.partOfSpeech ? <span>{item.partOfSpeech}</span> : null}
      </span>
      <span className="nado-word-popover__meaning">{item.meaning}</span>
      <span className="nado-word-popover__context">{item.contextMeaning}</span>
      {canSave ? (
        <button
          aria-label={getSaveActionLabel(item.term, state)}
          className="nado-word-popover__save"
          disabled={state !== "idle"}
          onClick={() => onSaveVocabularySuggestion?.(item)}
          type="button"
        >
          {getSaveActionText(state)}
        </button>
      ) : null}
    </span>
  );

  return (
    <span
      className={[
        "nado-word-token-wrap",
        isPopoverOpen ? "nado-word-token-wrap--open" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      onBlurCapture={(event) => {
        if (containsPopoverFocusTarget(event.relatedTarget)) {
          return;
        }

        setHasFocusWithin(false);
      }}
      onFocusCapture={() => {
        openFocusFromKeyboard();
      }}
      onPointerDownCapture={trackPointerFocus}
      onPointerEnter={openHover}
      onPointerLeave={closeHoverWithDelay}
    >
      <button
        aria-expanded={isPopoverOpen ? true : undefined}
        aria-label={`${text} 뜻과 저장 액션 보기`}
        className="nado-word-token"
        ref={tokenRef}
        type="button"
      >
        {text}
      </button>
      {popoverRoot ? createPortal(popover, popoverRoot) : popover}
    </span>
  );
}

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
      left,
      placement: "bottom",
      top: bottomPlacementTop,
      width,
    };
  }

  return {
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

type WordPopoverStyle = CSSProperties & {
  "--nado-word-popover-left"?: string;
  "--nado-word-popover-top"?: string;
  "--nado-word-popover-width"?: string;
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function createWordPopoverStyle(
  position: WordPopoverPosition | null,
): WordPopoverStyle | undefined {
  if (!position) {
    return undefined;
  }

  return {
    "--nado-word-popover-left": `${Math.round(position.left)}px`,
    "--nado-word-popover-top": `${Math.round(position.top)}px`,
    "--nado-word-popover-width": `${Math.round(position.width)}px`,
  };
}

function getNearestScrollportRect(element: HTMLElement): RectLike {
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

function getWordPopoverSize(popover: HTMLElement): SizeLike {
  const rect = popover.getBoundingClientRect();

  return {
    height: Math.max(rect.height, popover.scrollHeight),
    width: WORD_POPOVER_WIDTH,
  };
}

function isScrollableOverflow(value: string) {
  return (
    value === "auto" ||
    value === "scroll" ||
    value === "hidden" ||
    value === "clip"
  );
}

function toRectLike(rect: DOMRect): RectLike {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function areWordPopoverPositionsEqual(
  currentPosition: WordPopoverPosition | null,
  nextPosition: WordPopoverPosition,
) {
  return (
    currentPosition?.left === nextPosition.left &&
    currentPosition.placement === nextPosition.placement &&
    currentPosition.top === nextPosition.top &&
    currentPosition.width === nextPosition.width
  );
}

function getSaveActionLabel(
  term: string,
  state: VocabularySuggestionSaveState,
) {
  if (state === "saving") {
    return `${term} 저장 중`;
  }

  if (state === "saved") {
    return `${term} 저장됨`;
  }

  return `${term} 저장`;
}

function getSaveActionText(state: VocabularySuggestionSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "저장됨";
  }

  return "+ 저장";
}
