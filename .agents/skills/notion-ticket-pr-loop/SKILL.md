---
name: notion-ticket-pr-loop
description: nado 저장소에서 Notion 티켓 기반 작업을 진행할 때 사용한다. Notion 작업에서 branch 또는 PR을 만들거나, PR 상태를 동기화하거나, 이 저장소의 Notion `프로젝트` 데이터 소스를 갱신해야 할 때 사용한다.
---

# Notion 티켓 PR 루프

## 개요

이 저장소에서는 Notion `프로젝트`를 티켓 추적의 원장으로 사용한다. Codex 작업 세션은 구현과 리뷰 단계까지만 티켓을 이동하고, 최종 merge 완료 처리는 GitHub Actions가 담당한다.

## 필수 맥락

- 저장소 루트: 이 skill이 들어 있는 현재 checkout의 저장소 루트
- GitHub 저장소: `yunkooo/nado`
- Notion 데이터 소스: `프로젝트`
- Data source ID: GitHub Actions의 `NOTION_TICKETS_DATA_SOURCE_ID`로 설정한다. 값을 읽거나, 출력하거나, 하드코딩하거나, 커밋하지 않는다.
- 스키마 문서: `docs/workflow/notion-ticket-db-schema.md`
- PR 템플릿: `.github/pull_request_template.md`

## 접근 규칙

- Notion 도구는 현재 workspace에서 사용 가능하고 권한이 있을 때만 사용한다.
- Notion 접근 권한이 없으면 사용자에게 ticket URL과 현재 상태를 확인받고, 확인된 정보만 기준으로 진행한다.
- Notion 도구나 API 호출이 실제로 성공하기 전에는 티켓을 읽었거나 갱신했다고 말하지 않는다.
- `NOTION_TOKEN` 또는 `NOTION_TICKETS_DATA_SOURCE_ID` 값은 코드, 문서, 로그, PR 본문, 채팅에 노출하지 않는다.

## 상태 매핑

| 단계              | Notion `상태` |
| ----------------- | ------------- |
| 작업 전           | `TODO`        |
| 구현 시작         | `IN-progrss`  |
| PR 생성 또는 갱신 | `IN-review`   |
| PR merge 완료     | `DONE`        |

기존 상태값인 `IN-progrss` 철자를 그대로 사용한다. 티켓 작업 중에 이 값을 임의로 고치지 않는다.

## 티켓 작성 규칙

Notion 티켓을 새로 만들거나 사용자가 티켓 생성을 요청하면 제목만 만들지 않는다. 티켓에는 작업자가 바로 실행 범위를 이해할 수 있도록 속성과 본문을 함께 채운다.

### 작업 유형 선택

`작업 유형`은 아래 값 중 하나를 고른다.

| 작업 유형 | 기준                                                      |
| --------- | --------------------------------------------------------- |
| `기능`    | 새 기능, 새 화면, 새 사용자 흐름을 추가한다.              |
| `수정`    | 버그, 잘못된 동작, 실패한 상태 전이를 고친다.             |
| `문서`    | README, workflow 문서, 사용 가이드, 설명 주석을 정리한다. |
| `테스트`  | 테스트 추가, 테스트 보강, 검증 자동화 개선이 중심이다.    |
| `리팩터`  | 외부 동작은 유지하고 내부 구조, 이름, 경계를 개선한다.    |
| `설정`    | 빌드, CI, 패키지, 앱 설정, 환경 구성을 바꾼다.            |
| `보안`    | secret, 권한, 인증/인가, 민감 정보 노출 위험을 줄인다.    |
| `운영`    | 배포, 모니터링, 알림, 반복 운영 절차를 개선한다.          |

### 티켓 본문 템플릿

본문에는 다음 섹션을 채운다. 모르는 내용은 추측하지 말고 사용자에게 확인한다.

```markdown
## 배경

## 작업 유형

## 작업 범위

## 완료 조건

## 제외 범위

## 검증 계획

## 진행 메모
```

본문은 길 필요는 없지만, `완료 조건`과 `제외 범위`는 반드시 구체적으로 적는다.

## 절차

1. `AGENTS.md`, `docs/workflow/README.md`, `docs/workflow/notion-ticket-db-schema.md`를 읽는다.
2. 코드를 변경하기 전에 대상 Notion 티켓을 조회하거나 연다. Notion 접근 권한이 없으면 사용자에게 ticket URL과 현재 상태를 확인받는다.
3. 티켓 내용이 모호하면 추측하지 말고 멈춘 뒤 사용자에게 질문한다.
4. `git status --short --branch`로 git 상태를 확인하고 관련 없는 변경사항을 섞지 않는다.
5. 구현을 실제로 시작했고 Notion 접근 권한이 있을 때만 티켓을 `IN-progrss`로 옮긴다.
6. 티켓 하나에 대응하는 branch 하나를 만들거나 해당 branch로 전환한다.
7. 작업에 GitHub Issue도 연결되어 있으면 `AGENTS.md`의 Issue/PR branch naming 규칙을 따른다.
8. 티켓 범위 안에서만 구현하고, 가장 작지만 신뢰할 수 있는 검증 명령을 실행한다.
9. PR을 만들 때 `Ticket:` 줄에 Notion page URL을 넣는다.
10. Notion 접근 권한이 있으면 티켓을 `IN-review`로 옮기고, `GitHub PR`, `GitHub Branch`를 기록한 뒤 `Review Status`를 `Pending`으로 설정한다.
11. `CI Status`와 `Last CI Check`는 GitHub Actions가 기록하도록 둔다.
12. PR branch push 후에는 GitHub Actions가 `Last Push At`, `Last Head SHA`, `Last Push Summary`를 기록하도록 둔다. 사용자가 수동 진행 메모를 원하면 Notion 접근 권한이 있을 때만 `진행 메모`에 짧게 남긴다.
13. 티켓을 `DONE`으로 옮기지 않는다. `DONE` 처리는 PR merge 후 GitHub Actions가 담당한다.

## PR 본문 요구사항

PR 본문에는 반드시 다음 섹션이 있어야 한다.

```markdown
## Notion Ticket

- Ticket: https://app.notion.com/p/...
- Status before PR: `TODO` / `IN-progrss`
```

`Ticket:`이 없으면 `Notion Ticket Sync` GitHub Actions check가 실패하는 것이 정상이다.

## Blocker 처리

정보 부족, 권한 부족, 실패한 CI, 미해결 리뷰 피드백 때문에 막혔을 때는 다음 기준을 따른다.

- 현재 `상태`를 유지한다.
- Notion 접근 권한이 있으면 `Blocker`에 구체적인 원인과 해제 조건을 기록한다.
- 마지막으로 확인된 GitHub/Notion 상태를 사용자에게 보고한다.

## 확인 체크리스트

- 코드 변경 전에 티켓을 읽었거나, Notion 접근 권한이 없을 때 사용자가 티켓 상태를 확인해줬다.
- 티켓 하나는 범위가 분명한 branch 하나와 PR 하나에 대응한다.
- 새 티켓에는 `작업 유형`, `배경`, `작업 범위`, `완료 조건`, `제외 범위`, `검증 계획`이 채워져 있다.
- PR 본문에 Notion `Ticket:` URL이 들어 있다.
- Notion 접근 권한이 있으면 PR 생성 후 `GitHub PR`과 `GitHub Branch`를 기록했다.
- PR branch push 후에는 GitHub Actions가 push metadata를 갱신한다고 안내했다.
- CI 상태 기록은 GitHub Actions에 맡겼다.
- Notion 접근 권한이 있으면 merge 전 티켓 상태는 `IN-review`에서 멈추며, `DONE`으로 직접 옮기지 않았다.
