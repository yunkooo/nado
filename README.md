# nado

`nado`는 한국인을 위한 AI 영어 독해 학습 서비스다. 영어 한 문장이나 짧은 문단을 입력하면 번역, 독해 포인트, 문장 구조, 저장할 단어와 표현을 한 흐름으로 보여준다.

```text
영어 입력 → AI 분석 → 단어 저장 → 단어장 → 복습
```

Web, Expo React Native Mobile, Tauri Desktop이 같은 API와 제품 규칙을 사용한다. AI 분석은 선택한 모델에 따라 서버에서 OpenRouter 또는 OpenAI를 호출한다.

## 주요 기능

- 200자 이내 영어 문장·짧은 문단 분석
- 자연스러운 번역, 번역 포인트, 문장별 구조 분석
- Google 로그인 후 단어·표현 저장, 조회, 삭제
- 저장 항목을 이용한 양방향 플래시카드 복습
- Web, Mobile, Desktop 사이 단어장 Realtime 반영
- 입력 오류, 분석 불가, 네트워크 실패, timeout 상태 구분

제품 범위는 [제품 요구사항](PRD.md), 출시 전 검증 상태는 [릴리스 준비도](docs/release-readiness.md)에서 확인한다. 실제 작업의 진행 상태는 Notion `프로젝트` 티켓만 원장으로 사용한다.

## 저장소 구조

| 경로                 | 역할                                      |
| -------------------- | ----------------------------------------- |
| `apps/api`           | AI 분석, 인증 검증, 단어장, 사용량 제한   |
| `apps/web`           | Next.js 웹 앱                             |
| `apps/mobile`        | Expo React Native 앱                      |
| `apps/desktop`       | Tauri + React 데스크톱 앱                 |
| `apps/storybook`     | Web/Desktop UI 검증                       |
| `apps/e2e`           | Playwright 기반 핵심 흐름 검증            |
| `packages/shared`    | 공통 schema, 입력 검증, API 요청 규칙     |
| `packages/tokens`    | Web과 React Native가 공유하는 디자인 값   |
| `packages/ui-web`    | Web/Desktop 컴포넌트                      |
| `packages/ui-native` | React Native 컴포넌트                     |
| `packages/ui`        | `/web`, `/native` 공개 import 진입점      |
| `supabase`           | 로컬 설정과 database migration            |
| `docs`               | 제품, 실행, 협업, 디자인 시스템 기준 문서 |

## 기술 구성

- Frontend: React 19, Next.js, Expo React Native, Vite, Tauri
- Backend: Express, TypeScript, OpenRouter, OpenAI Responses API
- Auth/Database: Supabase Auth, Postgres, RLS, Realtime
- Monorepo: pnpm workspace, Turborepo
- Quality: Vitest, Playwright, TypeScript, Prettier, Storybook
- Deployment: Vercel Web, Railway API, Cloud Supabase

## 빠른 시작

필요한 도구는 Node.js 22.12 이상 23 미만, pnpm 11 이상, Docker Desktop이다.

```bash
pnpm install
cp .env.example .env
pnpm supabase:start
pnpm supabase:status
```

`supabase:status`에서 확인한 로컬 값을 `.env`에 설정한 뒤 API와 Web을 각각 실행한다.

```bash
pnpm dev:api
pnpm dev:web
```

Mobile, Desktop, Storybook 실행과 OAuth·환경변수 설정은 [로컬 개발 안내](docs/setup/local-development.md)를 따른다.

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

실행 중인 API의 실제 HTTP 경로는 `pnpm smoke:backend`로 확인할 수 있다.

## 문서

| 목적                  | 문서                                                         |
| --------------------- | ------------------------------------------------------------ |
| 전체 문서에서 길 찾기 | [문서 안내](docs/README.md)                                  |
| 제품 범위 이해        | [제품 요구사항](PRD.md)                                      |
| 로컬 실행과 문제 해결 | [로컬 개발](docs/setup/local-development.md)                 |
| 운영 배포와 rollback  | [운영 배포](docs/setup/production-deployment.md)             |
| Issue·PR·Notion 작업  | [협업 워크플로](docs/workflow/README.md)                     |
| 공통 token과 UI 경계  | [디자인 시스템](docs/design-system/README.md)                |
| 운영·실기기 출시 검증 | [릴리스 준비도](docs/release-readiness.md)                   |
| 단어장 동기화 확인    | [Realtime 검증](docs/setup/realtime-vocabulary-sync.md)      |
| Slack 알림 설정       | [Slack과 GitHub Actions](docs/setup/slack-github-actions.md) |
