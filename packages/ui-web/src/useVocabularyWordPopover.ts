import {
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  VocabularyItem,
  VocabularySuggestionSaveState,
} from "./analysisTypes";
import {
  areWordPopoverPositionsEqual,
  getClampedWordPopoverPosition,
  getNearestScrollportRect,
  getWordPopoverSize,
  toRectLike,
  type WordPopoverPosition,
} from "./wordPopoverPosition";

const WORD_POPOVER_CLOSE_DELAY_MS = 120;

export function useVocabularyWordPopover({
  canSave,
  forceOpen,
  item,
  state,
}: {
  canSave: boolean;
  forceOpen: boolean;
  item: VocabularyItem;
  state: VocabularySuggestionSaveState;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isTapOpen, setIsTapOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] =
    useState<WordPopoverPosition | null>(null);
  const [popoverRoot, setPopoverRoot] = useState<HTMLElement | null>(null);
  const hoverCloseDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerFocusRef = useRef(false);
  const previousSaveStateRef = useRef<VocabularySuggestionSaveState>(state);
  const tokenRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const isPopoverOpen = forceOpen || isHovering || hasFocusWithin || isTapOpen;

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

  const closeTapOpen = useCallback(() => {
    setIsTapOpen(false);
  }, []);

  const openTap = useCallback(() => {
    clearHoverCloseDelay();
    setIsTapOpen(true);
  }, [clearHoverCloseDelay]);

  const closeInteractionPopover = useCallback(() => {
    clearHoverCloseDelay();
    closeTapOpen();
    isPointerFocusRef.current = false;
    setHasFocusWithin(false);
    setIsHovering(false);
  }, [clearHoverCloseDelay, closeTapOpen]);

  const trackPointerFocus = useCallback(
    (event: ReactPointerEvent) => {
      if (event.pointerType === "touch") {
        openTap();
        return;
      }

      if (!shouldSuppressFocusFromPointer(event.pointerType)) {
        return;
      }

      closeTapOpen();
      isPointerFocusRef.current = true;
      setHasFocusWithin(false);

      window.setTimeout(() => {
        isPointerFocusRef.current = false;
      }, 0);
    },
    [closeTapOpen, openTap],
  );

  const openFocusFromKeyboard = useCallback(() => {
    if (isPointerFocusRef.current) {
      isPointerFocusRef.current = false;
      setHasFocusWithin(false);
      return;
    }

    setHasFocusWithin(true);
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

  const handleBlurCapture = useCallback(
    (event: ReactFocusEvent) => {
      if (containsPopoverFocusTarget(event.relatedTarget)) {
        return;
      }

      setHasFocusWithin(false);
    },
    [containsPopoverFocusTarget],
  );

  const focusPopoverSaveButton = useCallback(() => {
    const saveButton = popoverRef.current?.querySelector<HTMLButtonElement>(
      ".nado-word-popover__save:not(:disabled)",
    );

    if (!saveButton) {
      return false;
    }

    saveButton.focus();
    return true;
  }, []);

  const handleTokenKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Tab" || event.shiftKey) {
        return;
      }

      if (!isPopoverOpen || !canSave || state !== "idle") {
        return;
      }

      if (focusPopoverSaveButton()) {
        event.preventDefault();
      }
    },
    [canSave, focusPopoverSaveButton, isPopoverOpen, state],
  );

  const handleSaveButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Tab" || !event.shiftKey) {
        return;
      }

      event.preventDefault();
      tokenRef.current?.focus();
    },
    [],
  );

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
    if (typeof document !== "undefined") {
      setPopoverRoot(document.body);
    }
  }, []);

  useEffect(() => {
    const previousSaveState = previousSaveStateRef.current;
    previousSaveStateRef.current = state;

    if (previousSaveState !== "saved" && state === "saved") {
      closeInteractionPopover();
    }
  }, [closeInteractionPopover, state]);

  useEffect(() => {
    if (!isTapOpen || typeof document === "undefined") {
      return;
    }

    const closePopoverOutsideTap = () => {
      closeTapOpen();
      setHasFocusWithin(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containsPopoverFocusTarget(event.target)) {
        closePopoverOutsideTap();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      closePopoverOutsideTap();
      tokenRef.current?.blur();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeTapOpen, containsPopoverFocusTarget, isTapOpen]);

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
    popoverPosition?.height,
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

  return {
    closeHoverWithDelay,
    handleBlurCapture,
    handleSaveButtonKeyDown,
    handleTokenKeyDown,
    isPopoverOpen,
    openFocusFromKeyboard,
    openHover,
    popoverPosition,
    popoverRef,
    popoverRoot,
    tokenRef,
    trackPointerFocus,
  };
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function shouldSuppressFocusFromPointer(pointerType: string) {
  return pointerType === "mouse" || pointerType === "pen";
}
