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

분석 API는 사용량 추적을 위해 `analysis_usage_limits`를 `SUPABASE_SERVICE_ROLE_KEY`로 읽고 쓴다. 이 key는 서버 전용이며 웹, 모바일, 데스크톱 클라이언트에 노출하면 안 된다. 익명 사용자는 Express가 확인한 요청 IP를 `NADO_USAGE_IP_HASH_SALT`와 함께 SHA-256으로 해시해서 하루 단위로 추적하고, 로그인 사용자는 Supabase user id로 추적한다.

API 서버가 신뢰할 수 있는 reverse proxy 뒤에서 실행되고 그 proxy가 `X-Forwarded-For`를 덮어쓴다는 점이 확인된 경우에만 `NADO_TRUST_PROXY`를 설정한다. 로컬 기본값은 `0`이다. Railway 배포에서 실제 클라이언트 IP 기반 익명 제한이 필요하면 플랫폼의 proxy 동작을 확인한 뒤 `1` 또는 Express `trust proxy`가 지원하는 값을 설정한다.

일일 분석 제한은 아래 환경변수로 조정한다.

- `NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT`: 익명 사용자 하루 분석 제한
- `NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT`: 로그인 사용자 하루 분석 제한

값이 없거나 `0`이면 요청을 차단하지 않고 사용량만 기록한다. 제한에 도달하면 `POST /api/analyze`는 `429`와 `Retry-After` 헤더를 반환한다.

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

## 백엔드 smoke 검증

API 서버를 실행한 상태에서 아래 명령으로 실제 HTTP 경로를 확인한다.

```bash
pnpm smoke:backend
```

기본값은 `GET /health`만 확인한다. `.env`에 `NADO_SMOKE_ANALYZE_TEXT`가 있으면 `POST /api/analyze`도 확인한다. `NADO_SMOKE_ACCESS_TOKEN`이 있으면 단어장 저장, 목록, 삭제까지 확인한다.

```bash
NADO_API_BASE_URL=http://localhost:4000 \
NADO_SMOKE_ANALYZE_TEXT="I was wondering if you could help me." \
NADO_SMOKE_ACCESS_TOKEN="<Supabase access token>" \
pnpm smoke:backend
```

단어장 smoke 검증은 `NADO_SMOKE_VOCABULARY_TERM` 값으로 임시 단어를 저장한 뒤 삭제한다. 기본값은 `nado-smoke`다.

## 앱 경계

- `apps/web`: Next.js 웹 MVP의 첫 구현 대상
- `apps/mobile`: Expo React Native 앱
- `apps/desktop`: Tauri 데스크톱 shell
- `apps/storybook`: `packages/ui` 컴포넌트 작업 공간
- `apps/api`: Railway에 배포할 Node API 서버
- `packages/shared`: API schema, validation, 공통 타입
- `packages/ui`: 웹/Tauri 공통 UI 컴포넌트와 토큰
