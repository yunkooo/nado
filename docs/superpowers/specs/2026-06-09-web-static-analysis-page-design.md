# Web Static Analysis Page Design

작성일: 2026-06-09
상태: 구현 승인됨

## 목적

`apps/web`의 첫 화면을 PRD와 Storybook 목업에 맞는 정적 분석 화면으로 정렬한다. 이번 단위는 실제 API, OpenAI, Supabase 연결 전에 사용자가 제품의 핵심 흐름을 볼 수 있게 만드는 웹 화면 승격 작업이다.

## 근거 문서

- `PRD.md`: 웹 중심 MVP와 단일 기본 분석 방향
- `docs/prd/02-minimum-mvp.md`: 분석 화면 요구사항과 결과 표시 순서
- `docs/superpowers/specs/2026-06-09-storybook-design-system-from-mockup-design.md`: Storybook 기반 분석 화면 시각 언어
- `apps/storybook/src/AnalysisPageMock.stories.tsx`: 실제 조합 기준

## 범위

### 포함

- `apps/web` 홈 화면을 Storybook의 `InputSample`, `AnalysisResult`, `InputComposer` 조합으로 구성한다.
- 분석 화면은 로그인 없이 접근 가능한 첫 화면으로 둔다.
- 하단 composer는 입력값, 500자 제한, 빈 입력 disabled 상태, AI 전송 안내 문구를 보여준다.
- 결과 영역은 목업 데이터를 사용해 전체 번역, 번역 포인트, 문장별 분석, 우선 저장 추천 순서로 보여준다.
- 웹 전용 레이아웃 CSS는 `apps/web/src/app/globals.css`에 둔다.
- 웹 페이지 렌더링 테스트를 추가해 핵심 문구와 disabled 상태를 고정한다.

### 제외

- `/api/analyze` 호출
- OpenAI 분석 실행
- Supabase Auth와 Google 로그인 실제 연결
- 단어 저장, 단어장, 복습 화면 구현
- Storybook 디자인 시스템 자체 수정
- 모바일 앱과 데스크톱 앱 수정

## 화면 설계

웹 홈 화면은 사이드바, 상단 바, 결과 workspace, 하단 고정 composer로 구성한다. 데스크톱에서는 사이드바를 보여주고, 좁은 화면에서는 사이드바를 숨겨 결과와 입력 흐름에 집중한다.

결과 workspace는 현재 입력 예시와 분석 결과 카드를 세로로 배치한다. 실제 API가 연결되기 전까지는 Storybook 목업 데이터를 웹 내부 fixture로 복사해 사용한다. 이 데이터는 제품 UI 확인용이며 서버 응답 타입 확정 역할을 하지 않는다.

composer는 `useState`로 현재 입력값을 관리한다. 입력값이 비어 있으면 분석 버튼이 비활성화되고, 입력값이 있으면 AI 전송 및 원문 미저장 안내를 보여준다. 제출 동작은 아직 네트워크 요청을 보내지 않고 같은 화면 안에서 정적 결과를 유지한다.

## 커밋 단위

1. 문서와 구현 계획 추가
2. 웹 페이지 렌더링 테스트 추가
3. 웹 홈 화면과 CSS 구현
4. 검증 결과 반영과 필요한 미세 수정

## 성공 기준

- `apps/web` 홈 화면이 Storybook 목업과 같은 정보 구조를 가진다.
- PRD의 분석 결과 순서가 화면과 테스트에 반영된다.
- API 연결 없이도 웹사이트 첫 화면을 실행해 제품 방향을 확인할 수 있다.
- 기존 모바일 변경사항은 커밋에 포함하지 않는다.
