# 로컬 개발 세팅

이 문서는 `nado` 모노레포를 처음 실행할 때 필요한 최소 명령을 정리한다.

## 요구 도구

- Node.js 22 이상
- pnpm 11 이상
- Docker Desktop

Supabase CLI는 root devDependency로 설치한다. 별도 전역 설치 없이 `pnpm exec supabase ...`로 실행한다.

## 설치

```bash
pnpm install
```

## 자주 쓰는 명령

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:storybook
pnpm typecheck
pnpm test
pnpm build
```

## Supabase local stack

```bash
cp .env.example .env
pnpm supabase:start
pnpm supabase:status
```

`supabase:status` 출력의 local anon key와 service role key를 `.env`에 채운다. 실제 운영 key나 OpenAI key는 커밋하지 않는다.

API 서버는 단어장 API에서 `Authorization: Bearer <Supabase access token>` 헤더를 읽어 `supabase.auth.getUser(token)`으로 사용자를 검증한다. 단어장 조회, 저장, 삭제는 사용자 토큰이 붙은 Supabase client로 실행해서 `vocabulary_items`의 RLS 정책을 그대로 적용한다.

분석 API는 서버 환경변수의 `OPENAI_API_KEY`를 사용한다. `OPENAI_MODEL`은 기본 예시값을 제공하지만, 비용과 품질을 비교한 뒤 Railway 환경변수에서 조정할 수 있다.

## API 서버 확인

```bash
pnpm dev:api
```

주요 엔드포인트:

- `GET /health`
- `POST /api/analyze`
- `GET /api/vocabulary`
- `POST /api/vocabulary`
- `DELETE /api/vocabulary/:id`

`/api/analyze`는 로그인 없이 사용할 수 있다. `/api/vocabulary` 계열은 Google 로그인 후 받은 Supabase access token이 필요하다.

## 앱 경계

- `apps/web`: Next.js 웹 MVP의 첫 구현 대상
- `apps/mobile`: Expo React Native 앱
- `apps/desktop`: Tauri 데스크톱 shell
- `apps/storybook`: `packages/ui` 컴포넌트 작업 공간
- `apps/api`: Railway에 배포할 Node API 서버
- `packages/shared`: API schema, validation, 공통 타입
- `packages/ui`: 웹/Tauri 공통 UI 컴포넌트와 토큰
