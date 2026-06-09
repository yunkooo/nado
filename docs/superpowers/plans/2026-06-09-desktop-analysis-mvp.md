# Desktop Analysis MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `apps/desktop` Tauri React app into a working analysis MVP that can submit text to the API and render shared UI analysis results.

**Architecture:** Keep desktop as a Vite React app with desktop-specific shell, state, and API client. Reuse `@nado/shared` validation helpers and `@nado/ui` analysis components, while avoiding Next.js-only web modules.

**Tech Stack:** React 19, Vite, Tauri, Vitest, TypeScript, `@nado/shared`, `@nado/ui`.

---

## File Structure

- Create `apps/desktop/src/analysisApi.ts`: desktop analyze API client, API base URL handling, server response mapping to `AnalysisResultData`.
- Create `apps/desktop/src/analysisApi.test.ts`: API client tests for URL handling, success mapping, server errors, not analyzable responses, and network failures.
- Create `apps/desktop/src/analysisState.ts`: small external store for desktop analysis page state with session storage persistence.
- Create `apps/desktop/src/analysisState.test.ts`: state store tests for text updates, analysis state updates, persistence restore, and reset.
- Modify `apps/desktop/src/App.tsx`: replace placeholder screen with the desktop analysis MVP UI.
- Modify `apps/desktop/src/styles.css`: add desktop shell, result state, composer, and notification styles.
- Modify `apps/desktop/tsconfig.json`: include Vitest globals only if needed by tests.

## Tasks

### Task 1: Desktop API Client

**Files:**
- Create: `apps/desktop/src/analysisApi.test.ts`
- Create: `apps/desktop/src/analysisApi.ts`

- [ ] **Step 1: Write failing API tests**

Create `apps/desktop/src/analysisApi.test.ts` with tests that call `analyzeText("  I was wondering if you could help me.  ", { apiBaseUrl: "http://127.0.0.1:8787", fetcher })` and expect the fetch URL `http://127.0.0.1:8787/api/analyze`, trimmed request body, and mapped `AnalysisResultData`.

- [ ] **Step 2: Run API tests and verify RED**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/analysisApi.test.ts`
Expected: FAIL because `./analysisApi` does not exist.

- [ ] **Step 3: Implement API client**

Create `apps/desktop/src/analysisApi.ts` with `analyzeText`, `resolveAnalyzeApiUrl`, server response parsing, error message handling, and API result mapping equivalent to the web client.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/analysisApi.test.ts`
Expected: PASS.

### Task 2: Desktop Analysis State Store

**Files:**
- Create: `apps/desktop/src/analysisState.test.ts`
- Create: `apps/desktop/src/analysisState.ts`

- [ ] **Step 1: Write failing state tests**

Create tests for `createAnalysisStateStore` covering initial idle state, `setText`, `setAnalysisState`, session storage restore, and `reset`.

- [ ] **Step 2: Run state tests and verify RED**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/analysisState.test.ts`
Expected: FAIL because `./analysisState` does not exist.

- [ ] **Step 3: Implement state store**

Create `apps/desktop/src/analysisState.ts` with `createAnalysisStateStore`, `useAnalysisPageState`, text state, analysis state, save notice state, vocabulary save state, session storage persistence, and reset.

- [ ] **Step 4: Run state tests and verify GREEN**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/analysisState.test.ts`
Expected: PASS.

### Task 3: Desktop App UI

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`

- [ ] **Step 1: Write failing app source test**

Add source-level assertions to `apps/desktop/src/App.test.tsx` that confirm `App.tsx` uses `AnalysisResult`, `InputSample`, `InputComposer`, `useAnalysisPageState`, and `analyzeText`, and that `styles.css` defines desktop shell/result/composer classes.

- [ ] **Step 2: Run app test and verify RED**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/App.test.tsx`
Expected: FAIL because the placeholder app does not include the analysis MVP structure.

- [ ] **Step 3: Implement app UI**

Update `App.tsx` to validate input, call `analyzeText`, render idle/loading/error/success states, render save-login notice for vocabulary suggestions, and use shared UI components.

- [ ] **Step 4: Implement desktop styles**

Update `styles.css` with `desktop-shell`, `desktop-sidebar`, `desktop-workspace`, `desktop-analysis-page`, `desktop-composer-wrap`, `desktop-analysis-status`, and `desktop-save-status` styles.

- [ ] **Step 5: Run app test and verify GREEN**

Run: `pnpm --filter @nado/desktop test -- apps/desktop/src/App.test.tsx`
Expected: PASS.

### Task 4: Full Desktop Verification

**Files:**
- Verify only desktop files and preserve unrelated Storybook/UI working-tree changes.

- [ ] **Step 1: Run desktop tests**

Run: `pnpm --filter @nado/desktop test`
Expected: PASS.

- [ ] **Step 2: Run desktop typecheck**

Run: `pnpm --filter @nado/desktop typecheck`
Expected: PASS.

- [ ] **Step 3: Run desktop lint**

Run: `pnpm --filter @nado/desktop lint`
Expected: PASS.

- [ ] **Step 4: Run desktop build**

Run: `pnpm --filter @nado/desktop build`
Expected: PASS.

- [ ] **Step 5: Check git scope**

Run: `git status --short --branch`, `git diff --stat`, and `git diff --check`.
Expected: desktop implementation files and plan file are the only new changes from this task, aside from unrelated pre-existing Storybook/UI changes.
