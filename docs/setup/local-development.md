# 로컬 개발

처음 실행할 때는 아래 순서대로 진행한다. 모든 앱은 저장소 루트의 `.env`를 기준으로 시작한다.

필요한 범위까지만 진행해도 된다.

| 하려는 일                | 필요한 단계                         |
| ------------------------ | ----------------------------------- |
| API와 Web 화면 실행      | 1~3단계                             |
| 실제 AI 분석             | 1~3단계 + 사용할 provider key 1개   |
| 로그인·단어장 확인       | 1~3단계 + 5단계                     |
| Mobile·Desktop·Storybook | 위 설정 후 필요한 앱만 4단계로 실행 |

## 1. 준비

필요한 도구:

- Node.js 22.12 이상 23 미만
- pnpm 11 이상
- Docker Desktop

버전 관리 도구를 사용한다면 저장소 루트의 `.node-version`으로 검증된 Node.js 패치 버전을 맞춘다. 지원 범위는 루트 `package.json`의 `engines`가 기준이다.

플랫폼 앱을 실행할 때는 추가 도구가 필요하다.

| 대상           | 추가 도구                                       |
| -------------- | ----------------------------------------------- |
| Mobile iOS     | Xcode, iOS simulator 또는 연결한 기기           |
| Mobile Android | Android Studio, Android SDK, emulator 또는 기기 |
| Desktop        | Rust toolchain과 운영체제별 Tauri build 도구    |

```bash
pnpm install
cp .env.example .env
```

실제 key와 token은 `.env`에만 넣고 커밋하지 않는다.

## 2. Supabase 시작

```bash
pnpm supabase:start
pnpm supabase:status
```

`supabase:status`에서 확인한 local anon key와 service role key를 `.env`에 입력한다.

| 환경변수                            | 사용 위치                | 공개 여부                  |
| ----------------------------------- | ------------------------ | -------------------------- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | API 서버                 | 서버 설정                  |
| `SUPABASE_SERVICE_ROLE_KEY`         | 사용량 추적 등 서버 작업 | 절대 공개하지 않음         |
| `NEXT_PUBLIC_SUPABASE_*`            | Web, Desktop fallback    | 공개 가능한 anon 값만 사용 |
| `EXPO_PUBLIC_SUPABASE_*`            | Mobile                   | 공개 가능한 anon 값만 사용 |

Supabase CLI는 workspace dependency이므로 전역 설치 없이 `pnpm exec supabase`로 실행한다.

## 3. API와 Web 실행

터미널을 나눠 실행한다.

```bash
pnpm dev:api
pnpm dev:web
```

기본 주소:

- API: `http://localhost:4000`
- Web: `http://localhost:3000`

먼저 `http://localhost:4000/health`로 process 생존 여부를 확인하고, `http://localhost:4000/ready`로 Supabase 연결까지 확인한 뒤 Web에서 분석 화면을 연다. Railway의 배포 health check 경로는 의존성 장애도 감지하는 `/ready`를 사용한다.

## 4. 다른 앱 실행

```bash
pnpm --filter @nado/mobile dev
pnpm --filter @nado/desktop tauri:dev
pnpm dev:storybook
```

Mobile의 일반 UI와 API 연결은 `dev`로 확인할 수 있다. `nado://auth/callback`을 사용하는 로그인은 Expo Go가 아니라 설치된 development build가 필요하다. 플랫폼별 development build는 다음 명령으로 설치한다.

```bash
pnpm --filter @nado/mobile ios
pnpm --filter @nado/mobile android
```

설치 후 Metro는 development client 모드로 실행한다.

```bash
pnpm --filter @nado/mobile dev:client
```

iOS·Android 실기기 OAuth 확인은 [P0 검증 항목](../release-readiness.md#p0-크로스-플랫폼-학습-흐름)에 기록한다.

| 앱      | 기본 API 환경변수                                               |
| ------- | --------------------------------------------------------------- |
| Web     | `NEXT_PUBLIC_API_BASE_URL`                                      |
| Mobile  | `EXPO_PUBLIC_API_BASE_URL` 또는 `EXPO_PUBLIC_NADO_API_BASE_URL` |
| Desktop | `VITE_API_BASE_URL` 또는 `VITE_NADO_API_BASE_URL`               |

Mobile의 API 주소는 실행 환경에 맞춰 바꾼다.

- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`
- 실기기: 같은 네트워크의 개발 컴퓨터 IP 또는 접근 가능한 API URL

`.env.example`의 `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`은 앱의 Android 자동 fallback보다 우선하므로, Android emulator에서는 반드시 값을 바꾼다.

Mobile의 Supabase 주소도 실행 환경에서 개발 컴퓨터에 도달할 수 있는 host로 설정한다.

- Android emulator: `http://10.0.2.2:54321`
- iOS simulator: `http://127.0.0.1:54321`
- 실기기: 같은 네트워크의 개발 컴퓨터 IP를 사용하는 `http://<LAN-IP>:54321`

`.env.example`의 `EXPO_PUBLIC_SUPABASE_URL`은 특정 플랫폼에서만 동작하는 loopback 주소 대신 placeholder로 둔다. `pnpm --filter @nado/mobile ios` 또는 `android`를 실행하기 전에 위 주소 중 현재 환경에 맞는 값을 `.env`에 입력한다.

패키징한 Desktop 앱의 API host를 바꾸면 환경변수만 수정해서는 안 된다. `apps/desktop/src-tauri/capabilities/default.json`의 HTTP 허용 목록과 `apps/desktop/src-tauri/tauri.conf.json`의 CSP도 같은 host로 갱신한다.

## 5. Google OAuth 설정

Google Cloud OAuth client의 승인된 redirect URI에 Supabase callback을 등록한다.

```text
http://127.0.0.1:54321/auth/v1/callback
```

Supabase Auth의 Redirect URLs에는 실제로 돌아올 앱 주소를 허용한다.

| 환경      | Redirect 예시                                                      |
| --------- | ------------------------------------------------------------------ |
| Web local | 현재 Web origin                                                    |
| Web 배포  | 실제 Vercel origin                                                 |
| Mobile    | `nado://auth/callback` 또는 `EXPO_PUBLIC_MOBILE_AUTH_REDIRECT_URL` |
| Desktop   | `http://127.0.0.1:17654`                                           |

Desktop은 PKCE authorization code를 loopback callback으로 받은 뒤 실행 중인 앱에서 session으로 교환한다. URL fragment의 access/refresh token은 처리하지 않는다.

로컬 `supabase/config.toml`에는 Desktop loopback과 Mobile custom scheme이 허용되어 있다. redirect URL을 바꿨다면 `pnpm supabase:stop` 후 `pnpm supabase:start`로 local stack을 다시 시작한다.

## 6. AI provider와 timeout

분석 모델에 따라 서버 key가 다르다.

| Provider   | 환경변수             | 서버 기본 timeout | 클라이언트 timeout |
| ---------- | -------------------- | ----------------- | ------------------ |
| OpenRouter | `OPENROUTER_API_KEY` | 150초             | 155초              |
| OpenAI     | `OPENAI_API_KEY`     | 30초              | 35초               |

재시도가 발생해도 서버의 전체 시간 예산은 새로 시작하지 않는다. Supabase 요청의 기본 timeout은 10초이며 `SUPABASE_TIMEOUT_MS`로 조정한다.

## 7. 개발 단계 사용량 제한

```text
NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT=0
NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT=0
```

현재 코드와 `.env.example`의 기본값 `0`은 개발 편의를 위한 무제한 설정이다. 환경변수를 생략해도 기본값은 `0`이다.

운영에서는 두 환경변수를 반드시 명시한다. `0`은 사용량을 기록하되 요청을 차단하지 않는 무제한 설정이고, PostgreSQL integer 범위 안의 양수(`1`~`2147483647`)는 실제 일일 상한이다. 익명 `3`, 로그인 `20`은 정책 예시일 뿐 기본값이 아니다. 운영의 누락·음수·범위를 벗어난 값은 서버 시작 시 거부하고, 개발 중 잘못된 숫자는 첫 유효한 분석 요청에서 오류로 드러난다. 일일 기간은 UTC 자정을 기준으로 전환되며, 양수 제한에 도달하면 API는 `429`와 `Retry-After`를 반환한다.

익명 제한을 실제 사용자 IP 기준으로 적용하려면 운영 `NADO_USAGE_IP_HASH_SALT`에 충분히 긴 임의 secret을 설정한다. 신뢰할 reverse proxy가 없거나 앱이 인터넷에 직접 노출되면 `NADO_TRUST_PROXY=0` 또는 `false`를 사용한다. 배포 proxy가 `X-Forwarded-For`를 안전하게 덮어쓰는 환경에서만 실제 hop 수 `1`~`10`을 설정한다.

## 8. 검증

E2E를 처음 실행하는 컴퓨터에서는 Chromium을 한 번 설치한다.

```bash
pnpm e2e:install
```

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:db:upgrade
pnpm supabase:lint
pnpm supabase:advisors
pnpm test:db
pnpm e2e
```

`pnpm test:db:upgrade`는 로컬 DB를 초기화한 뒤 legacy fixture에 최신 migration을 적용하고, 검증 데이터를 정리한 최신 schema를 남긴다. 따라서 직후에 `pnpm supabase:reset`을 다시 실행할 필요가 없다.

API 서버가 실행 중이라면 smoke 검증을 추가한다.

```bash
pnpm smoke:backend
```

분석과 단어장까지 확인하려면 `.env`에 아래 값을 준비한다.

```text
NADO_SMOKE_ANALYZE_TEXT=I was wondering if you could help me.
NADO_SMOKE_ACCESS_TOKEN=<Supabase access token>
```

`.env.example`의 선택 smoke 값은 기본적으로 비어 있다. 두 값을 비우면 `/health`와 `/ready`만 확인하므로 Supabase가 실행 중이어야 한다. 분석은 영어 입력을 설정할 때만, 단어장 검증은 유효한 access token을 설정할 때만 실행한다. `NADO_SMOKE_VOCABULARY_TERM`을 생략하면 실행마다 고유한 term을 만든다.

Realtime까지 확인하는 방법은 [단어장 Realtime 검증](realtime-vocabulary-sync.md)을 참고한다.

## 문제 확인 순서

1. 실행 중인 process와 port를 확인한다.
2. API `/health`와 `/ready`를 직접 호출한다.
3. 앱의 API base URL이 같은 서버를 가리키는지 확인한다.
4. Supabase URL과 anon key가 모든 앱에서 같은 프로젝트인지 확인한다.
5. OAuth Redirect URLs와 실제 callback URL을 비교한다.
6. 그 다음 앱 로그와 GitHub Actions 로그를 확인한다.
