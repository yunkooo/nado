# 단어장 Realtime 동기화 검증

이 문서는 Supabase Realtime 기반 단어장 동기화가 web, desktop, mobile 사이에서 정상 동작하는지 확인하는 절차를 정리한다.

## 전제 조건

- `vocabulary_items` Realtime broadcast migration이 로컬 또는 운영 Supabase에 적용되어 있어야 한다.
- API 서버와 web, desktop, mobile 앱이 모두 같은 Supabase 프로젝트와 같은 API 서버를 바라봐야 한다.
- Google OAuth 로그인이 각 실행 환경의 redirect URL에서 정상 완료되어야 한다.
- 검증에 사용할 계정으로 web, desktop, mobile에 모두 로그인할 수 있어야 한다.

## 자동 smoke 검증

API 서버를 실행한 뒤 아래 명령으로 단어장 저장, 삭제, Realtime broadcast 수신을 함께 확인한다.

```bash
NADO_API_BASE_URL=http://localhost:4000 \
NADO_SMOKE_ACCESS_TOKEN="<Supabase access token>" \
NADO_SMOKE_REALTIME=1 \
pnpm smoke:backend
```

Realtime smoke는 access token의 `sub` 값을 사용해 `vocabulary:<user_id>` private channel을 구독한다. 토큰에서 user id를 읽을 수 없거나 다른 사용자로 검증해야 하면 `NADO_SMOKE_USER_ID`를 직접 지정한다.

```bash
NADO_API_BASE_URL=https://nadoapi-production.up.railway.app \
NADO_SMOKE_ACCESS_TOKEN="<Supabase access token>" \
NADO_SMOKE_REALTIME=1 \
NADO_SMOKE_USER_ID="<Supabase user id>" \
NADO_SMOKE_VOCABULARY_TERM="nado-realtime-smoke-20260615" \
pnpm smoke:backend
```

필요하면 아래 값을 명시할 수 있다. 지정하지 않으면 루트 `.env`의 Supabase 값 또는 공개 클라이언트용 Supabase 값을 사용한다.

```bash
NADO_SMOKE_SUPABASE_URL="<Supabase project URL>"
NADO_SMOKE_SUPABASE_ANON_KEY="<Supabase anon key>"
NADO_SMOKE_REALTIME_TIMEOUT_MS=5000
```

성공하면 checks에 아래 항목이 포함된다.

```text
health, vocabulary:save, vocabulary:realtime:save, vocabulary:list, vocabulary:delete, vocabulary:realtime:delete
```

`vocabulary:realtime:save`는 저장 후 `INSERT` 또는 `UPDATE` broadcast가 도착했음을 의미한다. smoke 단어가 이미 존재하는 환경에서는 upsert 성격의 저장이 `UPDATE`로 감지될 수 있다.

## 수동 크로스 플랫폼 검증

1. web, desktop, mobile을 같은 API 서버와 같은 Supabase 프로젝트에 연결한다.
2. 세 앱 모두 같은 Google 계정으로 로그인한다.
3. 세 앱의 단어장과 복습 페이지를 열고 현재 단어 수를 확인한다.
4. web의 분석 결과에서 고유한 단어 또는 표현을 저장한다.
   - 예: `nado-realtime-20260615-1430`
5. desktop과 mobile 단어장에 새 항목이 새로고침 없이 나타나는지 확인한다.
6. desktop과 mobile 복습 페이지에서도 새 항목이 새로고침 없이 반영되는지 확인한다.
7. mobile 단어장에서 해당 항목을 삭제한다.
8. web과 desktop 단어장, 복습 페이지에서 해당 항목이 새로고침 없이 사라지는지 확인한다.
9. 한 앱에서 로그아웃한 뒤 다른 앱에서 저장 또는 삭제를 실행한다.
10. 로그아웃된 앱이 Realtime 이벤트를 받아 단어장 화면을 갱신하지 않는지 확인한다.
11. 다른 계정으로 로그인한 뒤 이전 계정의 저장 또는 삭제 이벤트가 섞이지 않는지 확인한다.
12. 검증용으로 만든 단어가 남아 있다면 삭제한다.

## 실패 시 확인 순서

- 저장 또는 삭제 API가 실패하면 먼저 API 서버의 Supabase URL, anon key, service role key, RLS 정책을 확인한다.
- API는 성공하지만 Realtime smoke가 timeout이면 `NADO_SMOKE_SUPABASE_URL`과 앱의 Supabase URL이 같은지 확인한다.
- `vocabulary:<user_id>` topic이 현재 로그인한 Supabase user id와 일치하는지 확인한다.
- `realtime.messages` RLS policy가 private channel 접근을 허용하는지 확인한다.
- web, desktop, mobile 중 특정 앱만 갱신되지 않으면 해당 앱의 Realtime 구독 mount, session 변경 cleanup, logout cleanup을 확인한다.
- 화면 focus 또는 새로고침 후에만 반영되면 Realtime 이벤트가 데이터 refresh로 연결되지 않은 것이다.

## PR 기록

#36 검증 PR에는 아래 내용을 남긴다.

- 실행한 자동 smoke 명령과 checks 결과
- web 저장 -> desktop/mobile 반영 여부
- mobile 삭제 -> web/desktop 단어장과 복습 반영 여부
- 로그아웃 상태에서 이벤트 미수신 여부
- 세션 또는 계정 변경 후 이전 사용자 이벤트 미수신 여부
