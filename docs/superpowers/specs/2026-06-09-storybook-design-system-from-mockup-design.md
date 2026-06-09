# Storybook 디자인 시스템 목업 적용 설계

작성일: 2026-06-09
상태: 사용자 리뷰 대기

## 목적

첨부된 `nado default analysis mockup` HTML 목업을 기준으로, 분석 화면에 필요한 시각 언어와 UI 조각을 `packages/ui`와 `apps/storybook`에 먼저 반영한다. 이번 작업의 목표는 실제 웹 페이지 구현이나 API 연결이 아니라, 이후 웹 분석 화면을 조립할 때 재사용할 수 있는 Storybook 디자인 시스템 자산을 만드는 것이다.

## 배경

현재 모노레포에는 `packages/ui`의 `Button`, `InputComposer`, 기본 token/style과 `apps/storybook`의 기본 story가 있다. 하지만 목업의 실제 제품 톤은 더 구체적이다.

- 좌측 sidebar와 상단 topbar가 있는 작업형 화면
- 부드러운 회색 배경, 선명한 ink text, muted text, 얇은 border
- 8px 이하 radius 중심의 차분한 카드와 섹션
- 하단 고정 composer와 원형 send button
- 자연스러운 번역, 번역 포인트, 문장별 끊어 읽기, 문법 포인트, 우선 저장 추천을 한 화면에서 보여주는 결과 UI

따라서 다음 웹 화면 구현 전에 Storybook에서 목업과 같은 UI 단위를 먼저 검증한다.

## 범위

### 포함

- 목업 색상과 surface 체계를 `packages/ui/src/tokens.ts`와 `packages/ui/src/styles.css`에 반영한다.
- 기존 `Button`, `InputComposer`를 목업 톤에 맞게 확장한다.
- 분석 화면에 재사용할 UI 컴포넌트를 `packages/ui`에 추가한다.
- Storybook에 기본 UI, 분석 UI, 전체 목업 조합 story를 추가한다.
- 입력 composer의 빈 입력, 긴 입력, 200자 근처 상태를 Storybook에서 확인한다.
- 문장별 chunk가 모바일 폭에서도 줄바꿈되는 상태를 Storybook에서 확인한다.

### 제외

- `apps/web` 실제 `/` 페이지에 컴포넌트를 적용하지 않는다.
- `/api/analyze` 호출, OpenAI 연결, Supabase 저장 흐름은 구현하지 않는다.
- 로그인, 단어 저장, 단어장, 복습 기능은 구현하지 않는다.
- 목업과 무관한 디자인 시스템 문서 사이트를 만들지 않는다.

## 설계 원칙

- 목업을 단순 HTML로 복사하지 않고, 이후 제품 화면에서 조립 가능한 작은 컴포넌트로 분리한다.
- `packages/ui`는 웹과 Tauri에서 재사용 가능한 DOM 컴포넌트만 담는다.
- 분석 화면 전용이어도 여러 화면에서 반복될 수 있는 단위는 `packages/ui`에 둔다.
- Storybook story는 컴포넌트의 상태와 조합을 검증하는 작업 공간으로 둔다.
- 과한 추상화는 피하고, 목업에 실제로 나타난 UI만 추가한다.

## 컴포넌트 범위

### Foundations

- 색상 token: `ink`, `muted`, `line`, `soft`, `surface`, `blue`, `red`
- radius token: `sm`, `md`, `pill`
- shadow token: composer floating shadow
- typography helper class: eyebrow, section title, body text, compact label

Storybook:

- `Foundations/Tokens`
- 색상 swatch, radius, typography sample을 보여준다.

### 기본 UI

- `Button`
  - 기존 primary/secondary/ghost를 유지하되 목업 톤으로 조정한다.
  - composer send button을 위해 icon-only 원형 button variant를 추가한다.

- `Chip`
  - 우선 저장 추천에 쓰는 작은 action chip이다.
  - label, optional prefix, disabled 상태를 지원한다.

- `InputComposer`
  - 하단 composer 스타일을 반영한다.
  - placeholder, label, count, submit button을 포함한다.
  - 빈 입력이면 submit button disabled 상태를 보여준다.

Storybook:

- `UI/Button`
- `UI/Chip`
- `UI/InputComposer`

### 분석 결과 UI

- `InputSample`
  - 사용자가 입력한 영어 문단과 글자 수를 보여주는 상단 sample block이다.

- `ResultCard`
  - 분석 결과 전체를 감싸는 card shell이다.
  - header title, description, meta text를 받는다.

- `Section`
  - 분석 결과 내부의 반복 section wrapper다.
  - section title과 children을 받는다.

- `TranslationBlock`
  - 전체 자연스러운 번역을 문장 단위 paragraph로 보여준다.

- `TranslationNotes`
  - 번역 포인트 목록을 보여준다.

- `ReadingChunkLine`
  - 영어 chunk와 직역을 한 덩어리로 보여주고 chunk 사이에 `/` slash를 표시한다.
  - chunk 내부 영어와 직역은 줄바꿈하지 않는다.
  - 공간이 부족하면 chunk 블록 전체가 다음 줄로 내려간다.

- `GrammarPointList`
  - 대상 표현, 문법 이름, 설명을 분리해 보여준다.

- `SentenceAnalysis`
  - 문장 번호, `ReadingChunkLine`, 자연스러운 문장 번역, `GrammarPointList`를 조합한다.

- `VocabularySuggestionList`
  - 우선 저장 추천 chip 목록을 보여준다.

- `AnalysisResult`
  - 목업의 전체 분석 결과를 조합한다.

Storybook:

- `Analysis/InputSample`
- `Analysis/ReadingChunkLine`
- `Analysis/SentenceAnalysis`
- `Analysis/AnalysisResult`
- `Analysis/AnalysisPageMock`

## 데이터 형태

이번 작업은 API schema 확정이 아니라 Storybook 렌더링용 mock data를 다룬다. 그래도 이후 API 응답과 맞물리기 쉽도록 아래 형태로 둔다.

```ts
type AnalysisMock = {
  sourceText: string;
  translation: string[];
  translationNotes: Array<{
    term: string;
    note: string;
  }>;
  sentences: Array<{
    indexLabel: string;
    chunks: Array<{
      english: string;
      korean: string;
    }>;
    naturalTranslation: string;
    grammarPoints: Array<{
      target: string;
      type: string;
      explanation: string;
    }>;
  }>;
  vocabularySuggestions: Array<{
    term: string;
    meaning: string;
  }>;
};
```

Mock data는 `apps/storybook/src/analysisMock.ts`에 둔다. 실제 제품 타입과 API schema는 다음 단계에서 `packages/shared`에 별도로 확정한다.

## Storybook 검증 기준

- 목업 전체 조합이 Storybook에서 확인된다.
- composer는 빈 입력, 기본 입력, 200자 근처 입력 상태를 보여준다.
- chunk line은 desktop과 narrow container story에서 모두 가로 스크롤 없이 줄바꿈된다.
- 문법 포인트는 대상 표현과 문법 이름이 같은 label 영역에 붙어 보이고, 설명은 자연스럽게 줄바꿈된다.
- 추천 단어 chip은 여러 개가 flex wrap으로 배치된다.
- 버튼, composer, chip에 focus-visible 상태가 있다.

## 완료 조건

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.
- `pnpm dev:storybook`에서 추가된 story를 볼 수 있다.
- 이번 커밋에는 Storybook/디자인 시스템 적용 파일만 포함한다.
