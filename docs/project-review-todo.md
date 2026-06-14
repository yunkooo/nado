# 프로젝트 리뷰 및 TODO

작성일: 2026-06-09
수정일: 2026-06-13

## 리뷰 기준

- `README.md`
- `AGENTS.md`
- `PRD.md`
- `docs/prd/01-project-setup.md`
- `docs/prd/02-minimum-mvp.md`
- `docs/prd/03-expansion.md`
- `docs/setup/local-development.md`
- `docs/workflow/README.md`
- 현재 코드 구조

## 현재 판단

`nado`는 이제 단순 웹 MVP 초안이 아니라, API, Web, Mobile, Desktop, Storybook이 같은 schema와 학습 흐름을 공유하는 멀티 플랫폼 MVP 단계에 들어섰다. 분석, 단어 저장, 단어장, 복습의 핵심 기능은 웹뿐 아니라 모바일과 데스크톱에도 코드 수준으로 연결되어 있다.

다만 "기능이 코드에 있다"와 "제품으로 안정적으로 배포할 수 있다"는 아직 다르다. 지금부터의 우선순위는 새 기능 확장보다 실제 사용자 기준의 운영 검증, OAuth redirect, Supabase/Railway/Vercel 환경, 실기기/패키징 확인, 그리고 플랫폼별 UX 마감을 닫는 것이다.

## 현재 구현 상태

| 영역              | 상태                                         | 판단                                                                                                                                                       |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`        | 핵심 구현 완료, 운영 검증 필요               | 분석 API, 단어장 API, 인증 검증, 사용량 제한, Supabase migration, backend smoke가 있다. Cloud Supabase/Railway 환경 검증은 남아 있다.                      |
| `apps/web`        | MVP 기능 구현 완료, 실제 배포 flow 검증 필요 | 분석, 저장, 단어장, 삭제, 복습, Google 로그인 흐름이 연결되어 있다. 모바일 폭/키보드 접근성/배포 origin 검증이 남아 있다.                                  |
| `apps/mobile`     | API/Auth/학습 flow 연결, 실기기 검증 필요    | Expo 앱에 분석 API, Supabase Auth, 단어 저장/조회/삭제, 복습 흐름이 연결되어 있다. iOS/Android OAuth callback, API base URL, 실제 기기 UX 검증이 필요하다. |
| `apps/desktop`    | Tauri MVP 연결, 패키징 검증 필요             | 분석, 단어장, 복습, Supabase Auth PKCE, loopback/deep link callback, 운영 API fallback이 들어갔다. Tauri build, 설치본, OAuth 실패 케이스 검증이 필요하다. |
| `apps/storybook`  | 주요 상태 coverage 확보, 회귀 방지 필요      | 분석 결과, narrow, popover, 저장 chip 상태, 단어장 상태, 복습 카드 story가 있다. 앞으로는 새 UI 변경마다 story를 같이 갱신하는 운영 규칙이 중요하다.       |
| `packages/shared` | 공통 schema 기준 역할 수행                   | 입력 검증, 분석/단어장 schema, 페이지네이션 helper가 앱과 API의 계약 역할을 한다.                                                                          |
| `packages/ui`     | Web/Desktop/Storybook 공통 UI 역할 수행      | 분석 결과, 입력 composer, 단어 token/popover, 저장 추천, 복습 카드, 토큰이 정리되어 있다.                                                                  |
| GitHub workflow   | 문서/템플릿 기반 운영 시작 가능              | Issue/PR template과 workflow 문서가 있으며, Issue 작업 요청의 branch/push/PR 범위와 commit 분리 규칙이 정리되어 있다.                                      |

## 잘 진행된 부분

- 모노레포가 `apps/*`와 `packages/*` 경계를 기준으로 정리되어 있다.
- API schema와 validation이 `@nado/shared`에 모여 Web, Mobile, Desktop, API가 같은 계약을 바라본다.
- `apps/api`가 OpenAI 분석, Supabase Auth/Postgres, 단어장 CRUD, 사용량 제한, CORS, trust proxy, smoke 검증을 담당한다.
- 웹 MVP는 분석 입력, 결과 표시, 저장 상태, 단어장, 복습 화면이 실제 API/Auth 흐름과 연결되어 있다.
- 모바일 앱은 더 이상 목업 중심이 아니라 Expo 환경에서 API, Supabase Auth, 단어장, 복습 흐름을 사용한다.
- 데스크톱 앱은 Tauri shell 수준을 넘어 분석/저장/단어장/복습, OAuth callback, 운영 API fallback을 포함한다.
- Storybook은 목업 기반 디자인 확인을 넘어 핵심 컴포넌트 상태를 보여주는 작업 공간이 되었다.
- Supabase migration과 로컬 개발 문서가 있어 로컬 DB/Auth/API 실행 기준이 남아 있다.
- GitHub Issue/PR workflow 문서와 template이 생겨 AI 작업도 같은 티켓 기반 흐름으로 진행할 수 있다.

## 주요 gap

1. 운영 배포 검증이 아직 프로젝트 완료 기준으로 닫히지 않았다.
   - Cloud Supabase, Railway API, Vercel Web, OAuth redirect URL, smoke 결과를 한 번에 확인하는 체크리스트가 필요하다.

2. 크로스 플랫폼 실제 사용자 flow의 증거가 부족하다.
   - Web, iOS, Android, Desktop 설치본에서 로그인, 분석, 저장, 단어장, 삭제, 복습을 각각 확인하고 결과를 기록해야 한다.

3. 모바일/데스크톱은 구현보다 환경 검증 위험이 더 크다.
   - 모바일 OAuth callback, Android emulator API URL, 실기기 API base URL, 데스크톱 loopback callback, Tauri 권한/CSP는 코드만으로 완료 판단하기 어렵다.

4. UI 품질은 핵심 기능 이후의 마감 검증이 필요하다.
   - 긴 단어, 긴 뜻 설명, 작은 화면, 키보드 접근성, popover 위치, 중복 클릭 방지, 오류 복구를 실제 화면에서 확인해야 한다.

5. PRD와 현재 구현 상태가 계속 동기화되어야 한다.
   - PRD 02의 MVP 완료 조건은 대부분 구현되었지만, 운영 검증과 플랫폼별 검증 상태가 `done / partial / todo`로 표시되어 있지 않다.

6. 자동화는 아직 최소 단계다.
   - Issue/PR 문서와 template은 준비되었지만, CI에서 lint/typecheck/test/build를 어떻게 실행할지 정리되어 있지 않다.

## 우선순위 TODO

### P0. 운영 배포 검증 닫기

- [ ] Cloud Supabase에 최신 migration이 적용되어 있는지 확인한다.
- [ ] Supabase Auth Google provider가 로컬, Vercel, 모바일 deep link, 데스크톱 loopback redirect URL을 모두 허용하는지 확인한다.
- [ ] Railway API 환경변수 목록을 문서화하고 실제 값이 들어갔는지 확인한다.
- [ ] `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`가 API 서버 경계에만 있는지 확인한다.
- [ ] `NADO_CORS_ORIGINS`에 실제 Vercel origin이 들어갔는지 확인한다.
- [ ] `NADO_USAGE_IP_HASH_SALT`를 운영 환경에서 설정한다.
- [ ] Railway proxy 동작 확인 후 `NADO_TRUST_PROXY` 값을 결정한다.
- [ ] `pnpm smoke:backend`로 health, analyze, vocabulary 저장/조회/삭제를 운영 API에 대해 확인한다.
- [ ] Vercel Web에서 Railway API를 호출하는 실제 분석 flow를 확인한다.

### P0. 크로스 플랫폼 MVP 플로우 검증

- [ ] Web 배포본에서 Google 로그인, 분석, 추천 저장, 단어장 반영, 삭제, 복습을 한 번에 확인한다.
- [ ] 모바일 iOS simulator 또는 실기기에서 Google 로그인 callback이 앱으로 돌아오는지 확인한다.
- [ ] 모바일 Android emulator 또는 실기기에서 API base URL과 Google 로그인 callback을 확인한다.
- [ ] 모바일에서 분석, 저장, 단어장 조회, 삭제, 복습 흐름을 실제 API로 확인한다.
- [ ] 데스크톱 `tauri:dev`에서 Google 로그인 loopback callback, 분석, 저장, 단어장, 삭제, 복습을 확인한다.
- [ ] 데스크톱 build 또는 설치본에서 운영 API fallback과 OAuth 실패 메시지를 확인한다.
- [ ] 각 플랫폼별 검증 결과를 날짜, 환경, 실패 지점과 함께 문서화한다.

### P1. 웹 품질 보강

- [ ] 분석 결과의 긴 chunk, 긴 단어, 긴 뜻 설명이 모바일 폭에서 깨지지 않는지 확인한다.
- [ ] hover/focus popover가 화면 가장자리에서 잘리지 않는지 확인한다.
- [ ] 모바일 웹에서 단어 tap popover 또는 대체 UI가 자연스럽게 동작하는지 확인한다.
- [ ] 키보드만으로 단어 focus, 저장 버튼 접근, 다음 섹션 이동이 가능한지 확인한다.
- [ ] 분석/저장/삭제 중 중복 클릭 방지 상태를 점검한다.
- [ ] 단어장 삭제 실패 시 메시지와 UI 복구 상태를 점검한다.
- [ ] API base URL, env 누락, 로그인 세션 만료 상황의 UI 메시지를 정리한다.

### P1. 모바일 앱 마감

- [ ] `EXPO_PUBLIC_NADO_API_BASE_URL`이 local, simulator, 실기기, 배포 후보 환경에서 어떻게 설정되는지 문서화한다.
- [ ] `EXPO_PUBLIC_MOBILE_AUTH_REDIRECT_URL`과 `nado://auth/callback` 설정을 Supabase Redirect URLs와 맞춘다.
- [ ] iOS와 Android에서 OAuth 실패, 취소, 재시도 메시지를 확인한다.
- [ ] 모바일 단어 tap interaction이 저장 UX와 충돌하지 않는지 확인한다.
- [ ] 모바일 단어장 loading, empty, error, stale data 상태를 실제 화면에서 확인한다.
- [ ] 모바일 복습 카드가 긴 뜻/설명에서 레이아웃을 깨지 않는지 확인한다.

### P1. 데스크톱 앱 마감

- [ ] `VITE_API_BASE_URL`과 운영 fallback API URL 정책을 문서화한다.
- [ ] `VITE_DESKTOP_AUTH_REDIRECT_URL=http://127.0.0.1:17654`를 Supabase Redirect URLs에 반영한다.
- [ ] loopback callback server 시작 실패 이벤트와 사용자 메시지를 실제 Tauri runtime에서 확인한다.
- [ ] Tauri CSP와 HTTP plugin 허용 origin이 운영 API/Supabase에 충분하고 과하지 않은지 확인한다.
- [ ] `pnpm --filter @nado/desktop tauri:build` 결과물을 실행해 로그인과 API 호출을 확인한다.
- [ ] 데스크톱 사이드바, 작은 창 크기, 키보드 탐색을 확인한다.

### P1. Storybook과 디자인 시스템 유지

- [x] `AnalysisResult` narrow 상태를 story로 확인할 수 있다.
- [x] 단어 popover open 상태를 story로 확인할 수 있다.
- [x] 저장 추천 chip의 idle, saving, saved disabled 상태를 story로 확인할 수 있다.
- [x] 단어장 item, empty, error 상태를 story로 확인할 수 있다.
- [x] 복습 카드의 answer hidden, revealed 상태를 story로 확인할 수 있다.
- [ ] 새 UI 변경 시 Storybook story를 함께 갱신하는 규칙을 PR checklist에 연결한다.
- [ ] Storybook build를 CI 또는 PR 확인 단계에 포함할지 결정한다.
- [ ] 시각 회귀 테스트가 필요한지 MVP 이후에 다시 판단한다.

### P1. 문서와 workflow 정리

- [ ] PRD 02의 MVP 완료 조건별 현재 상태를 `done / partial / todo`로 표시한다.
- [ ] 로컬 개발 문서에 Web, API, Supabase, Mobile, Desktop을 각각 실제로 검증하는 순서를 추가한다.
- [ ] Railway 배포 문서를 별도로 만든다.
- [ ] Cloud Supabase Auth 설정과 redirect URL 체크리스트를 문서화한다.
- [ ] 운영 smoke 검증 결과를 기록하는 checklist 문서를 만든다.
- [ ] GitHub Actions로 lint, typecheck, test, build를 어디까지 자동화할지 결정한다.
- [ ] Issue 작업 요청 후 목적별 commit 분리 규칙이 실제 PR에서 잘 지켜지는지 다음 2-3개 PR에서 확인한다.

### P2. 제품 확장 후보

- [ ] 단어장 검색과 word/phrase 필터를 검토한다.
- [ ] 긴 글 분석은 비용, UI 밀도, 분석 단위 제한을 먼저 설계한다.
- [ ] 예문 생성은 OpenAI 비용과 캐싱 정책을 함께 설계한다.
- [ ] 간격 반복 학습은 정답/오답 기록을 포함하는 별도 PRD로 분리한다.
- [ ] 분석 히스토리는 원문 저장 동의와 삭제 정책이 생기기 전까지 보류한다.
- [ ] 브라우저 확장, PWA, 결제는 MVP 운영 검증 이후 다시 판단한다.

## 추천 다음 작업

바로 다음 작업은 `P0. 운영 배포 검증 닫기`다. 현재 프로젝트의 위험은 기능 부재보다 환경 차이에서 생길 가능성이 더 크다. Cloud Supabase, Railway API, Vercel Web, OAuth redirect, smoke test를 먼저 닫으면 이후 모바일과 데스크톱 검증도 같은 기준으로 진행할 수 있다.

그 다음에는 `P0. 크로스 플랫폼 MVP 플로우 검증`을 진행한다. Web, Mobile, Desktop에서 같은 학습 flow가 실제로 이어진다는 증거가 생기면, 그때 Storybook/문서/CI를 보강하고 P2 확장을 시작하는 편이 안전하다.
