# PRD 01. 프로젝트 기반

상태: 기본 구조 구현 완료

## 목적

Web, Mobile, Desktop이 같은 제품 규칙과 API 계약을 사용하면서도 각 플랫폼에 맞는 UI를 제공할 수 있는 개발 기반을 정의한다.

## 현재 구조

| 영역                 | 책임                                        |
| -------------------- | ------------------------------------------- |
| `apps/api`           | AI 분석, 인증 검증, 단어장 API, 사용량 제한 |
| `apps/web`           | Next.js 웹 사용자 경험                      |
| `apps/mobile`        | Expo React Native 사용자 경험               |
| `apps/desktop`       | Tauri + React 데스크톱 사용자 경험          |
| `apps/storybook`     | Web/Desktop UI 상태 확인                    |
| `apps/e2e`           | Playwright 기반 핵심 흐름 검증              |
| `packages/shared`    | API schema, 입력 검증, 공통 요청 규칙       |
| `packages/tokens`    | Web과 React Native가 공유하는 디자인 값     |
| `packages/ui-web`    | Web/Desktop DOM 컴포넌트                    |
| `packages/ui-native` | React Native 컴포넌트                       |
| `packages/ui`        | `/web`, `/native` 공개 import 진입점        |
| `supabase`           | 로컬 설정과 database migration              |

자세한 UI 경계는 [디자인 시스템 문서](../design-system/README.md)를 참고한다.

## 핵심 원칙

### API 경계

- AI provider key와 Supabase service role key는 API 서버에서만 사용한다.
- 클라이언트는 분석과 단어장 CRUD를 API 서버에 요청한다.
- 클라이언트의 Supabase 사용 범위는 로그인 세션과 Realtime 구독이다.
- 요청과 응답은 `@nado/shared` schema로 검증한다.

### 플랫폼 경계

- Web과 Desktop은 DOM 기반 컴포넌트를 공유한다.
- Mobile은 WebView가 아니라 React Native 컴포넌트를 사용한다.
- 같은 파일을 억지로 공유하기보다 token 의미와 component prop 계약을 맞춘다.
- Storybook은 제품 앱이 아니라 Web/Desktop UI 검증 도구다.

### 환경 경계

- 로컬 database와 Auth는 Supabase CLI + Docker로 실행한다.
- 운영 database와 Auth는 Cloud Supabase를 사용한다.
- API, Web, Mobile, Desktop의 base URL은 환경변수로 분리한다.
- secret은 `.env`, GitHub Secrets, 배포 플랫폼 환경변수에서 관리하고 커밋하지 않는다.

## 로컬 실행 조건

- Node.js 22.12 이상 23 미만
- pnpm 11 이상
- Docker Desktop

실행 순서는 [로컬 개발 문서](../setup/local-development.md)를 따른다.

## 기본 검증

공통 검증 명령과 최초 E2E 준비 방법은 [로컬 개발의 검증 단계](../setup/local-development.md#8-검증)를 따른다.

## 완료 기준

- 모든 앱과 공통 패키지가 pnpm workspace 안에서 빌드된다.
- Web, Mobile, Desktop이 같은 분석·단어장 API 계약을 사용한다.
- Storybook과 Mobile demo에서 공통 token의 의미를 비교할 수 있다.
- local/cloud Supabase schema가 migration으로 관리된다.
- server-only secret이 클라이언트 번들에 포함되지 않는다.

기반 구조는 완료되었다. 운영 검증 증거는 [릴리스 준비도](../release-readiness.md)에서 확인하고, 실제 작업 상태는 Notion `프로젝트` 티켓에서 관리한다.
