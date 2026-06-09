# Desktop Analysis MVP Design

작성일: 2026-06-09
상태: 설계 승인됨

## 목적

`apps/desktop`의 Tauri 앱을 PRD와 현재 웹 분석 화면에 맞춰 동작 가능한 데스크톱 분석 MVP로 만든다. 이번 단위는 데스크톱 앱에서 영어 입력, 분석 요청, 분석 결과 표시까지 확인할 수 있게 만드는 데 집중한다.

## 근거 문서와 구현

- `PRD.md`: 데스크톱 앱은 Tauri 기반이며 웹 UI를 재사용한다.
- `docs/prd/02-minimum-mvp.md`: 분석 화면의 입력 제한, 결과 순서, 데스크톱 hover/focus 상호작용을 정의한다.
- `apps/web/src/app/page.tsx`: 현재 웹 분석 화면의 실제 상태, API 호출, 저장 안내 흐름이다.
- `apps/desktop/src/App.tsx`: 현재 데스크톱 앱은 시작 화면과 composer만 있는 초기 상태다.
- `packages/ui`: 분석 결과와 입력 composer를 제공하는 공통 UI 기준이다.

## 범위

### 포함

- `apps/desktop` 첫 화면을 분석 MVP 화면으로 교체한다.
- 입력은 PRD와 동일하게 최대 200자 기준을 적용한다.
- 빈 입력, 길이 초과, 지원하지 않는 문자 입력은 클라이언트에서 분석 요청을 막는다.
- 분석 요청은 데스크톱 전용 API base URL 설정을 통해 서버의 `/api/analyze`로 보낸다.
- 로딩, 분석 실패, 분석 불가, 성공 상태를 화면에 표시한다.
- 성공 결과는 `packages/ui`의 `InputSample`, `AnalysisResult`, `InputComposer` 조합으로 보여준다.
- 추천 단어 저장 버튼은 로그인 기능이 완성되기 전까지 로그인 필요 안내 상태로 처리한다.
- 데스크톱 전용 shell과 CSS를 만든다. Next.js 전용 `Link`, `AppShell`, `AuthControls`는 그대로 가져오지 않는다.
- desktop 전용 API/state 로직에는 단위 테스트를 추가한다.

### 제외

- Google 로그인과 Supabase Auth 완성
- 실제 단어 저장 성공 처리
- 단어장 화면
- 복습 화면
- 모바일 앱 수정
- 웹 앱 동작 변경
- Tauri native command 추가
- 오프라인 분석 또는 로컬 AI 모델

## 화면 설계

데스크톱 앱은 단일 분석 workspace로 시작한다. 왼쪽에는 간단한 제품 식별 영역과 현재 화면 이름을 두고, 오른쪽 또는 메인 영역에는 분석 결과와 입력 composer를 배치한다. 제품 설명용 landing 화면은 만들지 않는다.

초기 상태에서는 결과 영역에 빈 상태 문구를 보여주고, 하단 또는 하단 근처 composer에서 영어 문장을 입력한다. 분석 성공 후에는 입력했던 원문 샘플, 전체 번역, 번역 포인트, 문장별 분석, 우선 저장 추천 순서로 결과를 보여준다. 문장별 단어 hover/focus box는 `packages/ui`의 기존 분석 컴포넌트 동작을 따른다.

## 데이터 흐름

1. 사용자가 composer에 영어 문장을 입력한다.
2. desktop state가 입력값을 보관한다.
3. 제출 시 입력값을 NFKC 기준으로 정규화하고 길이와 지원 문자를 검사한다.
4. 유효하지 않으면 네트워크 요청 없이 화면에 안내한다.
5. 유효하면 API client가 desktop API base URL과 `/api/analyze`를 조합해 요청한다.
6. 서버 응답은 웹의 분석 mapping과 같은 UI 데이터 구조로 변환한다.
7. 성공 결과는 session storage에 저장해 앱 reload 후에도 유지한다.

API base URL은 Vite 환경 변수로 둔다. 값이 없거나 요청에 실패하면 데스크톱 화면에서 사용자가 서버 연결 문제로 이해할 수 있는 메시지를 보여준다.

## 에러 처리

- 빈 입력: 분석 버튼 비활성화
- 200자 초과: 요청 차단과 안내
- 지원하지 않는 문자: 요청 차단과 안내
- 서버 연결 실패: "분석 서버에 연결할 수 없어요. API 서버 설정을 확인해 주세요."
- OpenAI/API 실패: 서버 메시지가 있으면 표시하고, 없으면 공통 실패 문구를 표시
- `not_analyzable`: 서버가 준 사유를 표시하고 결과 영역은 유지하지 않는다.
- 비로그인 저장 시도: "단어 저장은 로그인 기능 연결 후 사용할 수 있어요." 안내

## 테스트와 검증

- desktop API client는 성공, 서버 에러, 분석 불가, 네트워크 실패를 테스트한다.
- desktop state는 입력값과 분석 결과 상태 전환을 테스트한다.
- desktop app typecheck, test, lint, build를 실행한다.
- 가능하면 Vite dev server로 화면을 열어 초기 상태와 결과 상태가 깨지지 않는지 확인한다.

## 커밋 단위

1. 데스크톱 분석 MVP 설계 문서 추가
2. desktop API/state 테스트 추가
3. desktop API/state 구현
4. desktop 화면과 CSS 구현
5. 검증 결과 반영과 필요한 미세 수정

## 성공 기준

- `apps/desktop` 첫 화면에서 PRD의 분석 흐름을 실행할 수 있다.
- 데스크톱 앱은 웹과 같은 공통 UI 컴포넌트와 분석 결과 구조를 사용한다.
- API 서버 주소가 없는 경우에도 실패 원인을 사용자가 이해할 수 있다.
- 단어장, 복습, 로그인은 이번 범위와 분리되어 남는다.
- 기존 Storybook/UI 변경사항은 이번 설계 커밋과 섞이지 않는다.
