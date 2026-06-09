# nado

한국인을 위한 영어 독해 보조 서비스입니다. 짧은 영어 문장이나 문단을 자연스러운 번역, 번역 포인트, 문장별 구조 분석, 단어 저장 흐름으로 바꾸는 것을 목표로 합니다.

## Monorepo

```text
apps/
  api/        Railway 배포용 API 서버
  desktop/    Tauri 데스크톱 앱
  mobile/     Expo React Native 앱
  storybook/  UI 컴포넌트 작업 공간
  web/        Next.js 웹앱
packages/
  shared/     API schema, validation, 공통 타입
  ui/         웹/Tauri 공통 UI 컴포넌트와 토큰
supabase/     로컬 Supabase 설정과 migration
```

## 시작하기

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

개발 서버:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:storybook
```

로컬 Supabase 실행 방법은 [로컬 개발 세팅](docs/setup/local-development.md)을 참고합니다.

## 백엔드 API

`apps/api`는 Express 기반 Node API 서버입니다.

- `POST /api/analyze`: 200자 이내 영어 입력을 정규화된 지원 문자 기준으로 검증하고 OpenAI Responses API의 구조화 응답을 반환합니다.
- `GET /api/vocabulary`: 로그인한 사용자의 단어장 목록을 반환합니다.
- `POST /api/vocabulary`: 단어/표현을 저장하고, 중복 항목은 뜻과 설명을 병합합니다.
- `DELETE /api/vocabulary/:id`: 로그인한 사용자의 단어장 항목만 삭제합니다.

단어장 API는 `Authorization: Bearer <Supabase access token>` 헤더가 필요합니다.
