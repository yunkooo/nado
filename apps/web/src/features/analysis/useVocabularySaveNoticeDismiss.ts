"use client";

import { useEffect } from "react";
import type { AnalysisStateStore } from "./analysisState";
import type { VocabularySaveNotice } from "./vocabularySaveNotice";

const VOCABULARY_SAVE_NOTICE_DISMISS_MS = 2500;

export function useVocabularySaveNoticeDismiss(
  message: VocabularySaveNotice | null,
  store: AnalysisStateStore,
) {
  useEffect(() => {
    return () => {
      store.setVocabularySaveMessage(null);
    };
  }, [store]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      store.setVocabularySaveMessage(null);
    }, VOCABULARY_SAVE_NOTICE_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [store, message]);
}
