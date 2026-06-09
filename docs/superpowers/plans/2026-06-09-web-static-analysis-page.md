# Web Static Analysis Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `apps/web` analysis page from the existing PRD, docs, and Storybook design system without connecting live APIs.

**Architecture:** Keep reusable analysis UI in `packages/ui` unchanged and compose it from `apps/web`. Store the temporary web fixture near the page so the API contract can be introduced later without changing the design-system package.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, `react-dom/server`, `@nado/shared`, `@nado/ui`.

---

## File Structure

- `apps/web/src/app/page.test.tsx`: static server-render test for the home page.
- `apps/web/src/app/page.tsx`: client page state, static fixture, and Storybook-derived component composition.
- `apps/web/src/app/globals.css`: web shell, sidebar, workspace, topbar, and composer layout styles.
- `docs/superpowers/specs/2026-06-09-web-static-analysis-page-design.md`: approved implementation scope.
- `docs/superpowers/plans/2026-06-09-web-static-analysis-page.md`: this execution plan.

### Task 1: Commit Scope Documents

**Files:**
- Create: `docs/superpowers/specs/2026-06-09-web-static-analysis-page-design.md`
- Create: `docs/superpowers/plans/2026-06-09-web-static-analysis-page.md`

- [ ] **Step 1: Verify document scope**

Run: `rg -n "T[B]D|TO[D]O|implement late[r]|fill in detail[s]" docs/superpowers/specs/2026-06-09-web-static-analysis-page-design.md docs/superpowers/plans/2026-06-09-web-static-analysis-page.md`

Expected: no matches.

- [ ] **Step 2: Check commit scope**

Run: `git status --short --branch`

Expected: new docs are listed, existing mobile changes remain unstaged.

- [ ] **Step 3: Commit only the docs**

Run:

```bash
git add docs/superpowers/specs/2026-06-09-web-static-analysis-page-design.md docs/superpowers/plans/2026-06-09-web-static-analysis-page.md
git commit -m "문서: 웹 정적 분석 화면 구현 계획 추가"
```

Expected: one local commit containing only the two docs.

### Task 2: Add Failing Web Page Render Test

**Files:**
- Create: `apps/web/src/app/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/page.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the PRD analysis flow from the Storybook components", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("기본 분석");
    expect(markup).toContain("입력 예시");
    expect(markup).toContain("분석 결과");
    expect(markup).toContain("전체 자연스러운 번역");
    expect(markup).toContain("번역 포인트");
    expect(markup).toContain("문장별 분석");
    expect(markup).toContain("우선 저장 추천");
    expect(markup).toContain("입력한 문장은 AI 분석을 위해 전송되며");
    expect(markup).toContain('aria-label="분석 요청"');
  });

  it("keeps the submit button disabled when the composer is empty", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("0 / 200");
    expect(markup).toContain("disabled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nado/web test -- src/app/page.test.tsx`

Expected: fail because the current page does not render the Storybook-derived full analysis flow and does not start with an empty composer.

### Task 3: Implement Static Web Analysis Page

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Update page composition**

Replace the temporary hand-built result sections in `apps/web/src/app/page.tsx` with imports from `@nado/ui`:

```tsx
import {
  AnalysisResult,
  Button,
  InputComposer,
  InputSample,
  type AnalysisResultData,
} from "@nado/ui";
```

Keep `useState` local to the page and initialize the composer with an empty string.

- [ ] **Step 2: Add static fixture**

Add a local `analysisFixture: AnalysisResultData` containing `sourceText`, `translation`, `translationNotes`, `sentences`, and `vocabularySuggestions`. Use the same product-shaped data as Storybook so the first web screen mirrors the verified mock.

- [ ] **Step 3: Render shell from fixture**

Render sidebar navigation, topbar, `InputSample`, `AnalysisResult`, helper text, and `InputComposer`. The `InputComposer` receives `value={text}`, `onValueChange={setText}`, `maxLength={MAX_ANALYSIS_TEXT_LENGTH}`, `submitAriaLabel="분석 요청"`, and an `onSubmit` that does not perform network work yet.

- [ ] **Step 4: Replace web CSS**

Update `apps/web/src/app/globals.css` so `.nado-app-shell`, `.nado-sidebar`, `.nado-workspace`, `.nado-analysis-page`, and `.nado-composer-wrap` match the Storybook fullscreen layout while keeping responsive rules for widths below `820px`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @nado/web test -- src/app/page.test.tsx`

Expected: both tests pass.

- [ ] **Step 6: Commit page and test**

Run:

```bash
git add apps/web/src/app/page.test.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css
git commit -m "기능: 웹 정적 분석 화면 구성"
```

Expected: one local commit containing only web files.

### Task 4: Final Verification

**Files:**
- Read: `apps/web/src/app/page.tsx`
- Read: `apps/web/src/app/page.test.tsx`
- Read: `apps/web/src/app/globals.css`

- [ ] **Step 1: Check formatting**

Run: `pnpm --filter @nado/web lint`

Expected: Prettier check passes for the web package.

- [ ] **Step 2: Check types**

Run: `pnpm --filter @nado/web typecheck`

Expected: TypeScript completes without errors.

- [ ] **Step 3: Check focused tests**

Run: `pnpm --filter @nado/web test -- src/app/page.test.tsx`

Expected: both HomePage tests pass.

- [ ] **Step 4: Check build**

Run: `pnpm --filter @nado/web build`

Expected: Next.js production build completes.

- [ ] **Step 5: Inspect final Git scope**

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
```

Expected: only pre-existing mobile and lockfile changes remain unstaged; no whitespace errors are reported.
