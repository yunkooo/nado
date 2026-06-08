# Storybook Design System From Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첨부 목업의 분석 화면 시각 언어와 재사용 UI를 `packages/ui`와 `apps/storybook`에 반영한다.

**Architecture:** 목업의 foundation token과 공통 컴포넌트는 `packages/ui`에 두고, 전체 화면 조합과 상태 검증은 `apps/storybook` story에서 수행한다.

**Tech Stack:** React 19, TypeScript, Storybook React Vite, Vitest, Prettier, pnpm/turbo.

---

## 구현 순서

- [ ] `packages/ui` 렌더링 테스트를 먼저 추가해 `Chip`, `InputComposer`, `ReadingChunkLine`, `AnalysisResult`의 핵심 출력과 상태를 고정한다.
- [ ] `tokens.ts`와 `styles.css`를 목업 palette, radius, shadow, typography helper 중심으로 정리한다.
- [ ] `Button`을 기존 variant와 호환되게 유지하면서 icon-only send 버튼 크기와 상태를 추가한다.
- [ ] `InputComposer`를 목업의 label, count, 원형 submit 버튼 구조로 확장한다.
- [ ] 분석 UI 컴포넌트와 타입을 `packages/ui/src`에 추가하고 `index.ts`에서 export한다.
- [ ] `apps/storybook/src/analysisMock.ts`에 목업 데이터를 추가한다.
- [ ] Storybook에 foundation, 기본 UI, 분석 UI, 전체 화면 목업 story를 추가한다.
- [ ] 좁은 폭 story에서 chunk wrap과 chip wrap이 깨지지 않는지 확인한다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 실행한다.
- [ ] `pnpm dev:storybook`으로 Storybook을 띄워 브라우저에서 주요 story를 확인한다.

## 파일 계획

- `packages/ui/src/tokens.ts`: 색상, radius, shadow token 확장.
- `packages/ui/src/styles.css`: 목업 기반 CSS 변수와 컴포넌트 스타일.
- `packages/ui/src/Button.tsx`: icon size와 send variant 추가.
- `packages/ui/src/InputComposer.tsx`: label, count label, submit aria label 추가.
- `packages/ui/src/Chip.tsx`: 추천 단어 chip 컴포넌트.
- `packages/ui/src/analysis.tsx`: 분석 결과 조합 컴포넌트와 타입.
- `packages/ui/src/index.ts`: 신규 export.
- `packages/ui/src/analysis.test.tsx`: 렌더링 테스트.
- `apps/storybook/src/analysisMock.ts`: 목업 기반 story data.
- `apps/storybook/src/*.stories.tsx`: foundation, chip, 분석 결과, 전체 목업 story.
- `apps/storybook/src/preview.css`: Storybook canvas와 전체 목업 조합 전용 레이아웃.

## 검증 기준

- 빈 composer는 submit 버튼이 disabled로 렌더링된다.
- 500자 근처 composer 상태가 Storybook에 있다.
- `ReadingChunkLine`은 slash separator와 chunk label을 렌더링한다.
- `AnalysisResult`는 번역, 번역 포인트, 문장별 분석, 우선 저장 추천을 모두 렌더링한다.
- 전체 목업 story에서 sidebar, topbar, 입력 예시, 결과 카드, composer 조합이 확인된다.
