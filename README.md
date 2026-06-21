# nado

한국인을 위한 AI 영어 독해 학습 서비스입니다. 사용자가 짧은 영어 문장이나 문단을 입력하면 자연스러운 번역, 번역 포인트, 문장별 구조 분석, 저장할 단어/표현, 복습 흐름까지 하나의 학습 루프로 제공합니다.

사용자가 ChatGPT에 매번 번역, 문법 분석, 단어 추출 프롬프트를 따로 작성하지 않아도 되도록, nado는 영어 독해에 필요한 흐름을 제품 안에 고정된 경험으로 녹이는 것을 목표로 합니다.

## 프로젝트 방향

- **학습 흐름 고정**: 입력 → AI 분석 → 단어 저장 → 복습으로 이어지는 짧은 학습 루프를 제공합니다.
- **신뢰할 수 있는 AI 응답**: OpenAI Responses API의 structured output을 `@nado/shared` schema로 다시 검증하고, 분석 실패/타임아웃/분석 불가 입력을 명시적으로 처리합니다.
- **여러 사용 환경 지원**: Next.js 웹, Expo React Native 모바일, Tauri 데스크톱이 같은 API와 공통 schema를 사용합니다.
- **재사용 가능한 UI**: `packages/ui`와 Storybook으로 분석 결과, 단어 저장, 단어장, 복습 카드 상태를 공통 컴포넌트로 관리합니다.
- **운영 가능한 백엔드**: Supabase Auth/Postgres/RLS, Railway API 배포, Vercel 웹 배포, 사용량 제한, CORS, smoke test를 고려합니다.

## 핵심 기능

- **AI 분석**
  - 200자 이내 영어 입력 검증
  - 자연스러운 한국어 번역
  - 번역 포인트와 문장별 chunk 분석
  - 문법 포인트와 저장 후보 단어/표현 추출
  - 영어 학습 입력으로 보기 어려운 경우 `not_analyzable` 상태 반환

- **단어장**
  - Supabase Auth access token 기반 조회/저장/삭제
  - 사용자별 RLS 정책을 그대로 타는 Supabase client 사용
  - 중복 단어 저장 시 의미와 설명 병합
  - 저장 중/저장됨/오류 상태를 UI에 반영

- **복습**
  - 저장한 단어를 기반으로 review card 표시
  - 뜻 가림/공개 상태와 다음 카드 이동 흐름 제공

- **멀티 플랫폼**
  - 웹: Next.js App Router
  - 모바일: Expo React Native
  - 데스크톱: Tauri + Vite + React
  - Storybook: 공통 UI 컴포넌트와 상태 검증

## Monorepo Architecture

```text
apps/
  api/        Express 기반 Node API 서버
  web/        Next.js 웹 MVP
  mobile/     Expo React Native 앱
  desktop/    Tauri 데스크톱 앱
  storybook/  UI 컴포넌트/상태 작업 공간

packages/
  shared/     API schema, Zod validation, 공통 타입
  ui/         웹/Tauri/Storybook 공통 UI 컴포넌트와 토큰

supabase/     로컬 Supabase 설정과 migration
docs/         PRD, 로컬 개발 세팅, 설계 문서
```

### 앱별 책임

| 영역              | 역할                                                        |
| ----------------- | ----------------------------------------------------------- |
| `apps/api`        | 분석 API, 단어장 API, 인증 검증, 사용량 제한, Supabase 연동 |
| `apps/web`        | 웹 MVP, 분석/단어장/복습 화면, Google 로그인                |
| `apps/mobile`     | React Native 기반 모바일 학습 경험                          |
| `apps/desktop`    | Tauri shell, 데스크톱 OAuth callback, 웹 UI 재사용          |
| `apps/storybook`  | 디자인 시스템 상태와 mock 기반 UI 검증                      |
| `packages/shared` | 클라이언트와 서버가 공유하는 입력/응답 schema               |
| `packages/ui`     | 분석 결과, 입력 composer, chip, 단어 popover, 복습 card     |

## Tech Stack

- **Frontend**: React 19, Next.js, Expo React Native, Vite, Tauri
- **Backend**: Express, TypeScript, OpenAI Responses API
- **Auth/DB**: Supabase Auth, Supabase Postgres, RLS
- **Design System**: Storybook, shared UI package, CSS tokens
- **Monorepo**: pnpm workspace, Turborepo
- **Quality**: Vitest, TypeScript strict mode, Prettier, package structure tests
- **Deployment Targets**: Vercel web, Railway API, Supabase cloud

## API Overview

`apps/api`는 `/api` prefix 아래에서 동작합니다.

| Method   | Path                  | 설명                               |
| -------- | --------------------- | ---------------------------------- |
| `GET`    | `/health`             | API 서버 상태 확인                 |
| `POST`   | `/api/analyze`        | 영어 입력을 AI 분석 결과로 변환    |
| `GET`    | `/api/vocabulary`     | 로그인 사용자의 단어장 목록 조회   |
| `POST`   | `/api/vocabulary`     | 단어/표현 저장 또는 중복 항목 병합 |
| `DELETE` | `/api/vocabulary/:id` | 로그인 사용자의 단어장 항목 삭제   |

단어장 API는 `Authorization: Bearer <Supabase access token>` 헤더가 필요합니다. 분석 API는 로그인 없이도 사용할 수 있지만, 익명/로그인 사용자별 일일 사용량 제한을 적용할 수 있습니다.

## 실행 방법

요구 도구:

- Node.js 22 이상
- pnpm 11 이상
- Docker Desktop

설치:

```bash
pnpm install
```

자주 쓰는 개발 서버:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:storybook
```

모바일/데스크톱:

```bash
pnpm --filter @nado/mobile dev
pnpm --filter @nado/desktop tauri:dev
```

로컬 Supabase:

```bash
cp .env.example .env
pnpm supabase:start
pnpm supabase:status
```

`supabase:status`에서 출력되는 local anon key와 service role key를 `.env`에 채웁니다. 운영 key, OpenAI key, Supabase service role key는 커밋하지 않습니다.

자세한 환경변수와 OAuth 설정은 [로컬 개발 세팅](docs/setup/local-development.md)을 참고합니다.

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

백엔드 smoke test:

```bash
pnpm dev:api
pnpm smoke:backend
```

`NADO_SMOKE_ANALYZE_TEXT`와 `NADO_SMOKE_ACCESS_TOKEN`을 설정하면 분석, 단어장 저장, 목록, 삭제까지 실제 HTTP 경로로 확인할 수 있습니다.

`NADO_SMOKE_REALTIME=1`을 추가하면 단어장 저장과 삭제가 Supabase Realtime broadcast로 수신되는지도 함께 확인합니다. 크로스 플랫폼 수동 검증 절차는 [단어장 Realtime 동기화 검증](docs/setup/realtime-vocabulary-sync.md)을 참고합니다.

## 설계 특징

- **AI 응답 검증**: structured output, schema validation, retry, timeout, error state를 API 계층에서 다룹니다.
- **프론트엔드 상태 검증**: Storybook 상태, responsive/narrow surface, 공통 UI package, 접근성 label과 focus 흐름을 함께 관리합니다.
- **명확한 패키지 경계**: 앱별 책임과 공통 패키지 경계를 분리하고, workspace package export와 source alias 문제를 테스트로 보호합니다.
- **인증과 데이터 보안**: 클라이언트는 사용자 access token만 사용하고, 서버 전용 key는 API 서버 환경변수로 분리합니다.
- **운영 환경 고려**: CORS, reverse proxy trust, usage limit, smoke test, 로컬/배포 환경변수를 문서화했습니다.

## 현재 문서

- [PRD Index](PRD.md)
- [프로젝트 세팅 PRD](docs/prd/01-project-setup.md)
- [최소 MVP 기능 PRD](docs/prd/02-minimum-mvp.md)
- [확장 기능 PRD](docs/prd/03-expansion.md)
- [로컬 개발 세팅](docs/setup/local-development.md)
- [단어장 Realtime 동기화 검증](docs/setup/realtime-vocabulary-sync.md)
