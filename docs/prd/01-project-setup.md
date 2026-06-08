# PRD 01. 프로젝트 세팅

작성일: 2026-06-08
수정일: 2026-06-09

## 목적

`nado`의 웹, 모바일 앱, 데스크톱 앱, 백엔드 API, Supabase 개발 환경, Storybook 기반 디자인 시스템을 하나의 모노레포 안에서 관리할 수 있게 만든다. 이 PRD는 사용자가 기능을 쓰기 전 필요한 개발 기반, 배포 경계, 공통 타입, 공통 UI 기준, 환경 분리를 정의한다.

## 배경

`nado`는 단순 웹앱이 아니라 Web, Expo Mobile, Tauri Desktop이 같은 백엔드 API를 사용하는 제품이다. AI 분석 비용 보호, Google 로그인, 단어장 데이터 저장, 사용량 제한을 일관되게 처리하려면 클라이언트별 구현보다 중앙 API 경계가 먼저 필요하다.

또한 분석 화면, 단어장, 복습 화면은 같은 제품처럼 보여야 한다. MVP 초기부터 Storybook과 디자인 시스템을 두면 웹 화면을 빠르게 만들면서도 버튼, 입력창, popover, 단어 카드 같은 반복 UI의 상태를 독립적으로 확인할 수 있다.

## 목표

- 모노레포 구조를 만든다.
- 웹, 모바일, 데스크톱, API 서버의 책임을 분리한다.
- 공통 API schema와 validation을 공유할 수 있는 패키지를 만든다.
- Storybook으로 UI 컴포넌트와 상태를 독립적으로 확인할 수 있게 한다.
- 디자인 시스템 패키지에서 웹/Tauri UI 컴포넌트와 공통 디자인 토큰을 관리한다.
- 로컬 Supabase 개발 환경과 Cloud Supabase 운영 환경을 분리한다.
- Railway에 배포할 백엔드 API 서버 구조를 준비한다.
- OpenAI API key, Supabase service key 등 민감 정보가 클라이언트에 노출되지 않게 한다.

## 범위

### 포함

- 모노레포 초기 구조
- `apps/web`
- `apps/mobile`
- `apps/desktop`
- `apps/storybook`
- `apps/api`
- `packages/shared`
- `packages/ui`
- `supabase`
- Storybook 초기 설정
- 디자인 토큰과 기본 UI 컴포넌트
- Supabase local development 설정
- Cloud Supabase 운영 프로젝트 연동 준비
- Railway API 서버 배포 준비
- 공통 env 문서화
- 기본 CI 또는 검증 명령 정의

### 제외

- 실제 화면의 완성 구현
- 실제 OpenAI 분석 품질 튜닝
- 앱스토어/플레이스토어 출시
- 데스크톱 오프라인 저장
- 결제, 크레딧, 유료 플랜
- 브라우저 확장
- 완성형 디자인 시스템 문서 사이트

## 사용자

- 개발자: 프로젝트를 로컬에서 실행하고, 각 앱과 API 서버를 개발한다.
- 포트폴리오 평가자: 웹, 모바일, 데스크톱, 백엔드가 어떤 경계로 설계되었는지 확인한다.

## 제품 요구사항

### 모노레포 구조

프로젝트는 아래 구조를 기본으로 한다.

```text
nado/
  apps/
    web/
    mobile/
    desktop/
    storybook/
    api/
  packages/
    shared/
    ui/
  supabase/
```

### 웹앱

- Next.js로 구현한다.
- 데스크톱/모바일 브라우저를 지원하는 반응형 UI를 제공한다.
- MVP에서 가장 먼저 구현되는 클라이언트다.

### 모바일 앱

- Expo React Native로 구현한다.
- WebView로 웹앱만 감싸지 않는다.
- 분석, 단어장, 복습 화면은 React Native 컴포넌트로 만든다.

### 데스크톱 앱

- Tauri로 구현한다.
- MVP에서는 웹 UI를 재사용하는 온라인 데스크톱 앱으로 둔다.
- 로컬 DB, 오프라인 단어장, 파일 시스템 기반 문서 저장은 MVP 이후로 둔다.

### Storybook

- `apps/storybook`에서 Storybook을 실행한다.
- Storybook은 `packages/ui`의 컴포넌트와 주요 상태를 문서화한다.
- API 서버, Supabase, OpenAI API 없이도 UI를 확인할 수 있어야 한다.
- 컴포넌트는 기본 상태, hover, focus, disabled, loading, error 상태를 확인할 수 있어야 한다.
- 분석 composer, 분석 결과 chunk, 단어 hover/focus popover, 단어장 행, 복습 카드처럼 MVP에서 반복되는 UI를 우선 등록한다.
- Storybook은 실제 제품 설명용 랜딩 페이지가 아니라 개발과 검증을 위한 UI 작업 공간으로 사용한다.

### 디자인 시스템

- `packages/ui`는 웹과 Tauri에서 재사용하는 UI 컴포넌트를 제공한다.
- Expo Mobile은 DOM 기반 컴포넌트를 그대로 재사용하지 않고, 같은 디자인 토큰과 컴포넌트 규칙을 참고해 React Native 컴포넌트로 구현한다.
- 디자인 토큰은 색상, 타이포그래피, spacing, radius, border, focus ring, shadow를 포함한다.
- 기본 컴포넌트는 버튼, 아이콘 버튼, 입력 composer, select/dropdown, popover, tab/sidebar item, table/list row, flashcard를 우선한다.
- 스타일 방향은 Codex 앱처럼 깔끔한 생산성 앱 느낌과 읽기 편한 학습 도구 느낌을 유지한다.

### 백엔드 API

- Railway에 배포하는 별도 API 서버를 둔다.
- 분석 API, 단어장 API, 인증 검증, 사용량 제한, OpenAI API 호출을 담당한다.
- Web, Expo Mobile, Tauri Desktop은 직접 DB에 접근하지 않고 API 서버를 호출한다.

### Supabase

- Supabase Auth는 Google 로그인과 사용자 인증을 담당한다.
- Supabase Postgres는 사용자, 단어장, 사용량 제한 데이터를 저장한다.
- 로컬 개발은 Supabase CLI와 Docker 기반 로컬 Supabase를 사용한다.
- 운영 환경은 Cloud Supabase를 사용한다.
- schema 변경은 migration으로 관리한다.

### 공통 패키지

`packages/shared`는 아래 항목을 제공한다.

- API 요청/응답 타입
- AI 분석 결과 schema
- 문장별 분석 `sentences`와 `chunks` schema
- 단어장 항목 타입
- 입력 길이와 validation 규칙
- 공통 에러 코드와 메시지 키

`packages/ui`는 아래 항목을 제공한다.

- 디자인 토큰
- 웹/Tauri 공통 UI 컴포넌트
- 컴포넌트별 Storybook stories
- 접근성 상태와 인터랙션 상태 예시
- MVP 화면을 구성하는 기본 layout primitive

## 환경 요구사항

- 로컬 개발 환경은 Web, API, Supabase local stack을 동시에 실행할 수 있어야 한다.
- Storybook은 API 서버와 Supabase local stack 없이 단독 실행할 수 있어야 한다.
- OpenAI API key는 API 서버 환경변수에만 저장한다.
- Supabase service role key는 클라이언트에 노출하지 않는다.
- 운영 환경의 API 서버는 Railway 환경변수로 민감 정보를 관리한다.

## 성공 기준

- 로컬에서 웹앱, API 서버, Supabase local stack을 실행할 수 있다.
- API 서버가 로컬 Supabase와 연결된다.
- API 서버가 환경변수에서 OpenAI API key를 읽을 수 있다.
- Web, Mobile, Desktop이 같은 API base URL 설정을 사용할 수 있다.
- Storybook에서 MVP 핵심 UI 컴포넌트를 독립적으로 확인할 수 있다.
- 웹앱과 Tauri 앱이 `packages/ui` 컴포넌트를 재사용할 수 있다.
- Cloud Supabase와 local Supabase의 schema를 migration으로 관리할 수 있다.
- 민감한 key가 클라이언트 번들에 포함되지 않는다.

## 리스크

- 앱이 3개라 초기 세팅 범위가 커질 수 있다.
- Storybook과 디자인 시스템을 너무 크게 잡으면 MVP 화면 구현이 늦어질 수 있다.
- 웹 UI 컴포넌트와 React Native 컴포넌트의 재사용 범위를 혼동할 수 있다.
- Supabase local과 Cloud Supabase schema가 어긋날 수 있다.
- 모바일/데스크톱 인증 토큰 저장 방식이 웹보다 복잡할 수 있다.
- Railway, Supabase, OpenAI 환경변수 관리가 누락되면 배포가 불안정해질 수 있다.

## 우선순위

1. 모노레포와 `packages/shared`, `packages/ui`
2. Storybook과 기본 디자인 토큰
3. Supabase local 개발 환경
4. API 서버와 Railway 배포 준비
5. Next.js 웹앱 초기 구조
6. Expo 앱 초기 구조
7. Tauri 앱 초기 구조

## 완료 조건

- `apps/web`, `apps/mobile`, `apps/desktop`, `apps/storybook`, `apps/api`, `packages/shared`, `packages/ui`, `supabase`가 존재한다.
- Storybook에서 기본 UI 컴포넌트와 MVP 핵심 상태를 확인할 수 있다.
- 개발자가 문서만 보고 로컬 개발 환경을 실행할 수 있다.
- API 서버가 DB와 AI 호출을 담당한다는 경계가 코드와 문서에 일치한다.
