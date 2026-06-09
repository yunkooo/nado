# 프로젝트 리뷰 및 TODO

작성일: 2026-06-09

## 리뷰 기준

- `PRD.md`
- `docs/prd/01-project-setup.md`
- `docs/prd/02-minimum-mvp.md`
- `docs/prd/03-expansion.md`
- `docs/superpowers/specs/2026-06-08-english-reading-note-design.md`
- 현재 코드 구조

## 현재 판단

`nado`는 웹 MVP의 핵심 사용자 흐름에 많이 가까워졌다. 분석 API, 입력 검증, OpenAI 구조화 응답, Supabase Auth/Postgres 기반 단어장, 사용량 제한, 웹 분석 화면, 단어 hover 저장, 단어장, 복습 화면이 이미 연결되어 있다.

다만 PRD의 MVP 완료 조건은 단순히 웹 화면이 보이는 상태가 아니라, 실제 로그인 사용자 기준으로 분석, 저장, 단어장, 복습이 안정적으로 이어지고 Web, Mobile, Desktop이 같은 API schema를 쓰는 상태다. 따라서 다음 단계는 새로운 확장 기능보다 웹 MVP 안정화와 실제 플로우 검증을 먼저 끝내는 것이 맞다.

## 잘 진행된 부분

- 모노레포 구조가 PRD 01의 앱/패키지 경계와 맞게 구성되어 있다.
- `packages/shared`에 분석 입력 검증, API schema, 단어장 schema가 정리되어 있다.
- `apps/api`가 분석, 단어장 CRUD, 인증 검증, 사용량 제한을 담당한다.
- OpenAI API key와 Supabase service role key가 서버 경계에 남도록 설계되어 있다.
- 웹 분석 화면은 200자 제한, 단일 기본 분석 flow, 결과 표시 순서, 저장 안내를 반영한다.
- 문장별 단어 hover/focus 저장 흐름이 PRD의 핵심 요구사항과 맞게 들어갔다.
- 단어장과 복습 화면은 로그인 필요, 빈 상태, 연결 오류, 실제 저장 항목 표시를 구분한다.
- Storybook과 `packages/ui`를 통해 분석 UI를 독립적으로 확인할 수 있다.

## 주요 gap

1. 실제 웹 MVP E2E 검증이 아직 문서화된 완료 상태가 아니다.
   - 로그인 후 분석, 단어 hover 저장, 추천 저장, 단어장 반영, 삭제, 복습 반영까지 한 번에 검증하는 체크가 필요하다.

2. 모바일 앱은 아직 목업 중심이다.
   - Expo 앱은 분석, 단어장, 복습 UI의 형태는 있지만 실제 API, Auth, 저장 흐름과 연결되어 있지 않다.

3. 데스크톱 앱은 시작점 수준이다.
   - Tauri shell과 `packages/ui` 재사용은 있지만 웹 MVP와 같은 분석/저장/복습 경험은 아직 없다.

4. Storybook 상태 coverage가 PRD 01 요구만큼 완성되지는 않았다.
   - hover, focus, disabled, loading, error 상태를 핵심 컴포넌트별로 더 명확히 보여줄 필요가 있다.

5. 운영 배포 준비가 아직 TODO로 남아 있다.
   - Railway API 배포, Cloud Supabase schema/env, Redirect URL, smoke 검증 절차가 실제 운영 기준으로 닫혀야 한다.

6. 확장 기능은 아직 시작하지 않는 편이 좋다.
   - 긴 글 분석, 검색/필터, 간격 반복, 히스토리는 MVP 안정화 뒤에 우선순위를 다시 정해야 한다.

## 우선순위 TODO

### P0. 웹 MVP 플로우 닫기

- [o] 실제 Google 로그인 상태에서 분석 화면을 연다.
- [o] 200자 이내 문장을 분석한다.
- [o] 분석 성공 후 입력창이 비워지고 결과가 유지되는지 확인한다.
- [o] 문장별 단어 hover/focus box에서 뜻, 품사, 문맥 의미가 보이는지 확인한다.
- [o] hover box의 `+ 저장` 버튼으로 단어를 저장한다.
- [o] 우선 저장 추천 칩으로 표현을 저장한다.
- [o] 저장 성공 토스트가 표시되고 자동으로 사라지는지 확인한다.
- [o] 이미 저장된 항목은 `+` 상태로 disabled 되는지 확인한다.
- [o] 단어장 화면에 저장 항목과 모든 뜻/설명이 표시되는지 확인한다.
- [o] 단어장 항목 삭제가 API와 UI 상태에 모두 반영되는지 확인한다.
- [o] 복습 화면이 실제 단어장 항목으로 카드 흐름을 제공하는지 확인한다.
- [o] 비로그인 상태에서 저장, 단어장, 복습이 로그인 필요 메시지로 분기되는지 확인한다.

### P0. 백엔드와 Supabase 운영 안정화

- [ ] Cloud Supabase에 최신 migration이 적용되어 있는지 확인한다.
- [ ] Google Auth provider와 Redirect URL을 로컬/배포 origin 모두에 맞게 정리한다.
- [ ] Railway API 환경변수 목록을 문서화하고 실제 값이 들어갔는지 확인한다.
- [ ] `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 서버 전용으로 유지한다.
- [ ] `NADO_USAGE_IP_HASH_SALT`를 운영 환경에서 설정한다.
- [ ] `NADO_TRUST_PROXY`를 Railway proxy 동작 확인 후 설정한다.
- [ ] `pnpm smoke:backend`로 health, analyze, vocabulary 저장/조회/삭제를 확인한다.
- [ ] OpenAI 구조화 응답 실패와 rate limit 실패 메시지가 사용자에게 자연스럽게 보이는지 확인한다.

### P1. 웹 품질 보강

- [ ] 분석 결과의 긴 chunk, 긴 단어, 긴 뜻 설명이 모바일 폭에서 깨지지 않는지 확인한다.
- [ ] hover box가 화면 가장자리에서 잘리지 않는지 확인한다.
- [ ] 모바일 웹에서 단어 tap popover 또는 대체 UI를 구현한다.
- [ ] 키보드만으로 단어 focus, 저장 버튼 접근, 다음 섹션 이동이 가능한지 확인한다.
- [ ] 분석/저장/삭제 중 중복 클릭 방지 상태를 점검한다.
- [ ] 단어장 삭제 실패 시 메시지와 복구 상태를 점검한다.
- [ ] API base URL, env 누락, 로그인 세션 만료 상황의 UI 메시지를 정리한다.

### P1. Storybook 보강

- [ ] `AnalysisResult`에 단어 hover/focus popover 상태를 보여주는 story를 추가한다.
- [ ] 저장 추천 칩의 idle, saving, saved disabled 상태를 별도 story로 분리한다.
- [ ] 단어장 목록 item, 빈 상태, 오류 상태 story를 추가한다.
- [ ] 복습 카드의 answer hidden, revealed 상태 story를 추가한다.
- [ ] 모바일 폭 story 또는 narrow surface에서 hover/tap 대체 UI를 확인한다.

### P1. 문서 정리

- [ ] PRD 02의 MVP 완료 조건별 현재 상태를 `done / partial / todo`로 표시한다.
- [ ] 로컬 개발 문서에 웹과 API를 동시에 띄운 뒤 실제 로그인 flow를 확인하는 순서를 추가한다.
- [ ] Railway 배포 문서를 별도로 만든다.
- [ ] Cloud Supabase Auth 설정과 redirect URL 체크리스트를 문서화한다.
- [ ] smoke 검증 결과를 기록하는 체크리스트를 만든다.

### P2. 모바일 앱 MVP 연결

- [ ] Expo 앱에서 목업 단어장/복습 데이터를 제거한다.
- [ ] 모바일 앱의 API base URL 환경 분리를 구현한다.
- [ ] 모바일 Google 로그인과 token 저장 방식을 결정한다.
- [ ] 모바일 분석 화면을 `POST /api/analyze`와 연결한다.
- [ ] 모바일 단어 저장, 단어장 조회, 삭제를 API와 연결한다.
- [ ] 모바일 복습 화면을 실제 단어장 항목으로 연결한다.
- [ ] 모바일에서 단어 tap popover 또는 bottom sheet를 구현한다.

### P2. 데스크톱 앱 MVP 연결

- [ ] Tauri 앱에서 웹 MVP를 재사용할지, 별도 Vite UI를 유지할지 결정한다.
- [ ] 데스크톱 API base URL 설정을 정리한다.
- [ ] 데스크톱 Google 로그인 처리 방식을 결정한다.
- [ ] 데스크톱 분석, 단어장, 복습 화면을 웹과 같은 schema로 연결한다.
- [ ] MVP에서는 오프라인 저장과 로컬 DB를 제외한다는 경계를 유지한다.

### P3. MVP 이후 확장 후보

- [ ] 단어장 검색과 word/phrase 필터를 검토한다.
- [ ] 긴 글 분석은 비용, UI 밀도, 분석 단위 제한을 먼저 설계한다.
- [ ] 예문 생성은 OpenAI 비용과 캐싱 정책을 함께 설계한다.
- [ ] 간격 반복 학습은 정답/오답 기록을 포함하는 별도 PRD로 분리한다.
- [ ] 분석 히스토리는 원문 저장 동의와 삭제 정책이 생기기 전까지 보류한다.

## 추천 다음 작업

바로 다음 작업은 `P0. 웹 MVP 플로우 닫기`다. 지금은 기능을 더 늘리기보다 실제 로그인 사용자 기준으로 분석부터 복습까지 한 번에 검증하고, 실패하는 지점을 하나씩 닫는 편이 가장 가치가 높다.

그 다음에는 운영 배포 안정화와 Storybook 상태 coverage를 병렬로 진행한다. 웹 MVP가 안정적으로 닫힌 뒤에야 모바일과 데스크톱을 같은 API schema로 확장하는 것이 PRD 진행 원칙에 맞다.
