"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthControls } from "./AuthControls";
import { AppShellView, type AppShellNavigationKey } from "./AppShellView";
import { useAuthState } from "../features/auth/authState";
import {
  useRefreshVocabularyForActiveStudySurface,
  useSyncVocabularyForAuth,
  useSyncVocabularyRealtimeForAuth,
} from "../features/vocabulary/vocabularyState";

type AppShellProps = {
  activeItem: AppShellNavigationKey;
  children: ReactNode;
  workspaceLabel: string;
};

const focusableElementSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function AppShell({
  activeItem,
  children,
  workspaceLabel,
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const shouldRestoreMenuFocusRef = useRef(false);
  const authState = useAuthState();
  const isStudySurfaceActive =
    activeItem === "vocabulary" || activeItem === "review";
  const closeSidebar = useCallback(() => {
    shouldRestoreMenuFocusRef.current = true;
    setIsSidebarOpen(false);
  }, []);

  useSyncVocabularyForAuth(authState);
  useSyncVocabularyRealtimeForAuth(authState);
  useRefreshVocabularyForActiveStudySurface(
    authState,
    isStudySurfaceActive,
    activeItem,
  );

  useEffect(() => {
    if (!isSidebarOpen) {
      if (shouldRestoreMenuFocusRef.current) {
        shouldRestoreMenuFocusRef.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }

    closeButtonRef.current?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const sidebar = sidebarRef.current;

      if (!sidebar) {
        return;
      }

      const focusableElements = Array.from(
        sidebar.querySelectorAll<HTMLElement>(focusableElementSelector),
      ).filter((element) => element.getClientRects().length > 0);
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements.at(-1);

      if (!firstFocusableElement || !lastFocusableElement) {
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstFocusableElement ||
          !sidebar.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        (document.activeElement === lastFocusableElement ||
          !sidebar.contains(document.activeElement))
      ) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [closeSidebar, isSidebarOpen]);

  return (
    <AppShellView
      activeItem={activeItem}
      authControls={<AuthControls />}
      closeButtonRef={closeButtonRef}
      isSidebarOpen={isSidebarOpen}
      linkComponent={Link}
      menuButtonRef={menuButtonRef}
      onCloseSidebar={closeSidebar}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      sidebarRef={sidebarRef}
      workspaceLabel={workspaceLabel}
    >
      {children}
    </AppShellView>
  );
}
