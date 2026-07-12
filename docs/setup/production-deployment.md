# 운영 배포

이 문서는 Cloud Supabase, Railway API, Vercel Web을 같은 릴리스로 배포하고 문제가 생겼을 때 되돌리는 기준을 설명한다. 실제 key, token, project ID, access token은 문서·PR·로그에 남기지 않는다.

작업의 진행 상태와 담당자는 Notion `프로젝트` 티켓에서 관리한다. 이 문서에는 반복 가능한 절차만 두고, 실행 결과는 티켓에 배포 commit, 환경, 확인 시각, 실패 지점과 함께 남긴다.

## 배포 전 준비

- 배포할 commit SHA와 직전 정상 commit SHA를 기록한다.
- Cloud Supabase backup 또는 Point-in-Time Recovery 사용 가능 여부를 확인한다.
- Railway와 Vercel에서 직전 정상 deployment를 다시 활성화할 수 있는지 확인한다.
- 로컬에서 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 통과시킨다.
- migration을 로컬 DB에 처음부터 적용하고 DB lint와 pgTAP 계약 테스트를 통과시킨다.

```bash
pnpm supabase:start
pnpm test:db:upgrade
pnpm supabase:lint
pnpm supabase:advisors
pnpm test:db
```

`pnpm test:db:upgrade`는 로컬 DB를 초기화한 뒤 legacy fixture에 최신 migration을 적용하고, 검증 데이터를 정리한 최신 schema를 남긴다. 따라서 같은 검증 흐름에서 reset을 반복하지 않는다.

권장 배포 순서는 다음과 같다.

```text
호환 가능한 DB migration → Railway API → API smoke → Vercel Web → 사용자 흐름 확인
```

새 API와 이전 API가 모두 동작할 수 있는 호환 migration을 먼저 배포한다. 컬럼 삭제나 타입 변경처럼 이전 API를 깨뜨리는 작업은 데이터 추가·전환·정리를 여러 릴리스로 나눈다.

## 1. Cloud Supabase migration

### 적용 전 확인

저장소의 Supabase CLI를 사용해 대상 프로젝트를 연결하고 로컬·원격 migration 상태를 비교한다.

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
```

- `<project-ref>`는 실제 값을 문서나 PR에 복사하지 않는다.
- 예상하지 않은 원격 migration, 순서 차이, destructive SQL이 보이면 적용을 중단한다.
- 테이블을 외부 API로 노출하면 RLS 활성화, 사용자별 policy, 필요한 index를 함께 확인한다.
- Data API로 접근할 테이블과 함수는 `anon`, `authenticated`, `service_role` 중 실제 사용 역할에만 명시적으로 `GRANT`하고 나머지 권한은 회수한다.
- migration 파일에는 환경별 URL이나 secret을 넣지 않는다.

확인 후 적용한다.

```bash
pnpm exec supabase db push --linked
pnpm exec supabase migration list --linked
```

적용이 끝나면 Railway API를 배포하기 전에 Cloud Supabase dashboard에서 migration 상태와 Auth redirect 설정을 확인한다.

### Migration 되돌리기

이미 운영에 적용한 migration 파일을 수정하거나 삭제하지 않는다.

- 데이터 손실이 없는 변경은 반대 동작을 수행하는 새 migration을 작성한다.
- 컬럼 삭제, 데이터 변환처럼 되돌리기 어려운 변경은 먼저 API를 안전 모드 또는 직전 호환 버전으로 전환하고 backup 복원 여부를 결정한다.
- backup 복원은 같은 프로젝트의 모든 최근 데이터를 되돌릴 수 있으므로 영향 범위와 복원 시점을 사용자에게 확인한 뒤 수행한다.
- 보정 migration도 로컬 `db reset`과 관련 테스트를 통과시킨 뒤 Cloud에 적용한다.

## 2. Railway API

### 서비스 설정

Railway 서비스의 기준은 다음과 같다.

| 항목              | 값                                         |
| ----------------- | ------------------------------------------ |
| Root directory    | 저장소 루트                                |
| Build command     | `pnpm exec turbo build --filter=@nado/api` |
| Start command     | `pnpm --filter @nado/api start`            |
| Runtime           | Node.js 22.12 이상 23 미만, pnpm 11        |
| Health check path | `/ready`                                   |
| Port              | Railway가 주입하는 `PORT` 사용             |

`/health`는 API process가 응답하는지만 확인한다. Railway health check는 Supabase 의존성까지 확인하는 `/ready`를 사용한다.

### 환경변수 점검

값 자체가 아니라 아래 이름이 운영 서비스에 있는지만 확인한다.

| 구분             | 환경변수                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Runtime          | `NODE_ENV=production`                                                                                |
| AI provider      | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENROUTER_API_KEY`, `OPENROUTER_TIMEOUT_MS` |
| Supabase         | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_TIMEOUT_MS`              |
| 사용량 제한      | `NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT`, `NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT`                     |
| 익명 사용자 식별 | `NADO_USAGE_IP_HASH_SALT`                                                                            |
| Proxy와 CORS     | `NADO_TRUST_PROXY`, `NADO_CORS_ORIGINS`                                                              |

`OPENAI_MODEL`과 세 `*_TIMEOUT_MS`는 생략하면 코드 기본값을 사용한다. 값을 덮어쓸 때는 timeout에 양의 정수만 사용한다. API key, Supabase URL/key, 두 사용량 제한, salt, proxy와 CORS 설정은 production 시작 검증의 필수 항목이다.

- 운영 사용량 제한은 두 환경변수에 모두 명시한다. `0`은 사용량을 기록하되 차단하지 않는 무제한 정책이고, `1`~`2147483647`은 실제 일일 상한이다.
- 일일 사용량은 UTC 자정에 새 기간으로 전환되므로 사용자 안내와 운영 지표도 같은 경계를 사용한다.
- `NADO_USAGE_IP_HASH_SALT`에는 32자 이상의 임의 secret을 사용하고 다른 환경과 공유하지 않는다.
- `SUPABASE_URL`에는 credential, path, query, hash가 없는 Cloud Supabase의 정확한 HTTPS origin을 사용하고 anon key와 service role key도 같은 프로젝트 값인지 확인한다.
- 서버 설정 이름 `SUPABASE_SERVICE_ROLE_KEY`는 호환성을 위해 유지한다. 값은 가능하면 새 `sb_secret_...` secret key를 사용하고, 전환 중에는 legacy `service_role` JWT도 허용한다. 두 형식 모두 서버 밖에 노출하지 않는다.
- `NADO_CORS_ORIGINS`에는 실제 HTTPS Web origin을 쉼표로 구분해 적는다. path나 마지막 `/`는 넣지 않는다.
- Railway가 전달하는 `X-Forwarded-For` 경로를 확인한 뒤 `NADO_TRUST_PROXY`를 `1`~`10` 사이의 실제 proxy hop 수로 설정한다. 일반적인 단일 Railway proxy라면 먼저 `1`을 검증한다. 신뢰할 reverse proxy가 없는 직접 배포에서는 `0` 또는 `false`로 proxy 신뢰를 끈다. 모든 proxy를 신뢰하는 `true`나 임의의 CIDR·주소 목록은 운영 설정으로 허용하지 않는다.
- Railway의 `PORT`를 사용하며 `NADO_API_PORT`로 고정 포트를 덮어쓰지 않는다.

### 사용량 기록 보존

분석 사용량 기록은 기본 90일 보존을 기준으로 한다. Cloud Supabase Cron처럼 DB 내부에서 실행하면 database role로 함수를 하루 한 번 예약한다. 외부 스케줄러가 PostgREST RPC를 호출할 때만 service role credential을 서버에서 사용한다. 보존 기간을 바꿀 때는 비용·감사 요구사항을 먼저 확인하고 양의 일수만 전달한다.

```sql
select public.delete_expired_analysis_usage();
-- 예: 30일 보존
select public.delete_expired_analysis_usage(30);
```

이 함수는 자동으로 예약되지 않는다. 배포 후 scheduler 실행 이력과 삭제 건수를 관련 Notion 티켓에 기록하고, 일반 사용자 역할에서 실행할 수 없는지도 확인한다.

배포 후 Railway deployment가 active인지 확인하고 외부 URL에서 두 endpoint를 순서대로 호출한다.

```bash
curl --fail --show-error https://<api-origin>/health
curl --fail --show-error https://<api-origin>/ready
```

`/health`는 성공하지만 `/ready`가 `503`이면 Web을 배포하지 말고 Supabase URL, key, migration과 네트워크 상태를 먼저 확인한다.

## 3. Vercel Web과 OAuth

Vercel production 환경에는 다음 public 설정만 둔다.

| 환경변수                        | 역할                           |
| ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`      | Railway API의 HTTPS origin     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Cloud Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저에서 사용하는 anon key |

service role key와 AI provider key는 Vercel에 넣지 않는다. `NEXT_PUBLIC_*` 값이 바뀌면 새 Web deployment를 만들어 번들에 반영한다.

OAuth는 세 위치를 함께 맞춘다.

1. Google OAuth client에는 Cloud Supabase가 안내하는 callback URL을 등록한다.
2. Supabase Auth의 Site URL을 production Vercel origin으로 설정한다.
3. Supabase Auth Redirect URLs에 production origin과 실제로 사용할 preview origin 정책을 등록한다.

임의의 모든 preview URL을 허용하기보다 로그인 검증에 사용할 범위를 정한다. 배포 후 주소창의 origin, `NEXT_PUBLIC_API_BASE_URL`, Railway의 `NADO_CORS_ORIGINS`가 정확히 대응하는지 확인한다.

## 4. 배포 후 smoke

먼저 secret 없이 기본 연결을 확인한다.

```bash
NADO_API_BASE_URL=https://<api-origin> pnpm smoke:backend
```

이 검사는 `/health`와 `/ready`를 확인한다. AI 분석까지 확인할 때만 운영 비용 정책에 맞는 짧은 영어 입력을 일시적으로 전달한다.

```bash
NADO_API_BASE_URL=https://<api-origin> \
NADO_SMOKE_ANALYZE_TEXT="A short sentence." \
pnpm smoke:backend
```

단어장 smoke는 별도의 검증 계정 access token을 안전한 임시 환경변수로 전달할 때만 실행한다. token을 shell history, CI 로그, PR 본문에 남기지 않는다. smoke가 만든 항목이 정리되었는지도 확인한다.

마지막으로 Vercel Web에서 아래 흐름을 같은 검증 계정으로 확인한다.

```text
Google 로그인 → 분석 → 추천 저장 → 단어장 반영 → 삭제 → 복습
```

확인 결과에는 다음 정보만 기록한다.

| 기록 항목   | 예시 형식                         |
| ----------- | --------------------------------- |
| Notion 티켓 | 티켓 URL                          |
| 배포 commit | 짧은 commit SHA                   |
| 환경        | Cloud Supabase / Railway / Vercel |
| 마지막 확인 | `YYYY-MM-DD HH:mm KST`            |
| 결과        | 성공 또는 실패 단계               |
| 배포 URL    | secret이 없는 사용자 접근 URL     |

## 5. 장애 시 rollback

새 배포에서 오류가 확인되면 추가 변경을 계속 배포하지 않고 어느 경계에서 실패했는지 먼저 구분한다.

| 실패 경계                  | 우선 조치                                                       |
| -------------------------- | --------------------------------------------------------------- |
| Vercel Web만 실패          | 직전 정상 Web deployment로 rollback하고 API 상태를 유지한다.    |
| Railway API만 실패         | DB schema와 호환되는 직전 API deployment로 rollback한다.        |
| 환경변수 설정 실패         | 값을 바로잡고 재배포한 뒤 `/ready`와 smoke를 다시 실행한다.     |
| 호환 가능한 migration 실패 | 보정 migration을 작성하고 로컬 검증 후 적용한다.                |
| 데이터 손상 가능성         | 쓰기 경로를 중단하고 backup/PITR 복원 여부를 사용자와 결정한다. |

rollback 후에도 `/health`, `/ready`, 기본 smoke와 Web 사용자 흐름을 다시 확인한다. 실패 원인, 영향 시간, rollback deployment, 후속 보정 작업은 같은 Notion 티켓에 남긴다.
