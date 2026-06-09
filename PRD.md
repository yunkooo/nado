# nado PRD Index

작성일: 2026-06-08
수정일: 2026-06-09

## 제품 개요

`nado`는 한국인을 위한 영어 독해 보조 서비스다. 사용자가 영어 한 문장 또는 짧은 문단을 입력하면 자연스러운 한국어 번역, 번역 포인트, 문장별 구조 분석, 단어/표현 저장 후보를 정해진 흐름으로 제공한다.

핵심 가치는 사용자가 ChatGPT에 매번 "번역해줘", "문법도 분석해줘", "중요 단어도 뽑아줘" 같은 프롬프트를 쓰지 않아도, 앱이 영어 독해 학습에 필요한 흐름을 자동으로 적용하는 것이다.

## PRD 구성

이 프로젝트는 하나의 큰 PRD가 아니라 아래 3개 단위로 진행한다.

1. [프로젝트 세팅 PRD](docs/prd/01-project-setup.md)
   - 모노레포, 앱 구조, 백엔드, Supabase, Railway, Tauri, Storybook, 디자인 시스템, 공통 패키지, 개발/운영 환경을 정의한다.

2. [최소 MVP 기능 PRD](docs/prd/02-minimum-mvp.md)
   - 분석 화면, AI 분석 API, 단어 저장, 단어장, 복습, 인증, 에러 처리, 검증 범위를 정의한다.

3. [확장 기능 PRD](docs/prd/03-expansion.md)
   - 긴 글 분석, 공식문서 리더, 브라우저 확장, 앱 출시, 검색/필터, 간격 반복, 결제 등 MVP 이후 확장을 정의한다.

## 진행 원칙

- 먼저 프로젝트 세팅 PRD를 완료한다.
- 그 다음 최소 MVP 기능 PRD를 기준으로 웹 중심 MVP를 만든다.
- 모바일 앱과 데스크톱 앱은 같은 API schema를 기준으로 확장한다.
- 확장 기능 PRD는 MVP가 동작하고 사용 패턴을 확인한 뒤 우선순위를 다시 정한다.

## 현재 확정된 큰 방향

- 웹: Next.js
- 모바일 앱: Expo React Native
- 데스크톱 앱: Tauri, 웹 UI 재사용
- 백엔드 API: Railway 배포
- 인증/DB: Supabase Auth + Postgres
- 디자인 시스템: Storybook + `packages/ui`
- 로컬 개발: Supabase CLI + Docker
- 운영 환경: Cloud Supabase
- AI 분석: 서버에서 OpenAI API 호출
- 입력 제한: MVP 초기 최대 200자, 정규화된 지원 문자 기준으로 검증
- 분석 모드: 별도 모드 없이 단일 기본 분석

## 원본 설계 문서

상세 설계 원문은 [영어 독해 노트 MVP 설계](docs/superpowers/specs/2026-06-08-english-reading-note-design.md)를 기준으로 한다.
