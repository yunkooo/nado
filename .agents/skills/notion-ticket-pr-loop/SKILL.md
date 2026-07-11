---
name: notion-ticket-pr-loop
description: nado 저장소에서 Notion `프로젝트` 티켓을 GitHub Issue, branch, PR과 안전하게 연결하고 상태를 동기화할 때 사용한다. Notion 티켓 기반 구현을 시작하거나 branch 또는 PR을 만들 때, PR의 Ticket URL을 추가·수정할 때, PR·CI·리뷰·merge 상태를 Notion에 반영할 때 사용한다.
---

# Notion 티켓 PR 루프

Notion `프로젝트`를 작업 원장으로 사용한다. 작업자는 상태 흐름에서 구현 시작까지만 기록하고, PR 이후 상태와 GitHub metadata는 GitHub Actions에 맡긴다.

## 먼저 읽기

1. `AGENTS.md`를 읽는다.
2. `docs/workflow/README.md`에서 전체 흐름을 확인한다.
3. `docs/workflow/notion-ticket-db-schema.md`에서 필드 소유권과 동기화 안전 규칙을 확인한다.
4. Issue·branch·PR 작업이면 `docs/workflow/issue-workflow.md`와 `docs/workflow/pr-workflow.md`를 읽는다.
5. PR을 만들 때 `.github/pull_request_template.md`를 사용한다.

`NOTION_TOKEN`과 `NOTION_TICKETS_DATA_SOURCE_ID`의 실제 값은 읽거나 출력하거나 하드코딩하거나 커밋하지 않는다.

## 작업 전 확인

코드나 branch를 변경하기 전에 다음 순서로 확인한다.

1. 대상 티켓이 GitHub Actions에 설정된 `NOTION_TICKETS_DATA_SOURCE_ID`의 `프로젝트` 데이터 소스에 속하는지 확인한다.
2. 티켓의 제목, `작업 유형`, 본문, 상태, 기존 `GitHub PR`, `GitHub Branch`를 확인한다.
3. 티켓 본문에서 `배경`, `작업 범위`, `완료 조건`, `제외 범위`, `검증 계획`을 확인한다. 모호하거나 빠진 내용이 작업 방향을 바꾸면 사용자에게 질문한다.
4. 연결할 GitHub Issue를 확인하고 일반 Issue, cohesive parent, tracking parent, 독립 sub-issue 중 하나로 분류한다.
5. tracking parent라면 branch나 PR을 만들지 말고 native sub-issue를 선택하거나 생성·연결하도록 사용자에게 요청한다.
6. 작업 branch의 PR base가 저장소 default branch인지 확인한다.
7. `git status --short --branch`로 관련 없는 변경이 없는지 확인한다.

연결할 GitHub Issue가 없거나 Issue 유형을 확정할 수 없으면 branch를 만들지 말고 사용자에게 확인한다.

### Notion에 접근할 수 없을 때

사용자에게 다음 내용을 모두 확인받는다.

- 티켓 URL과 `프로젝트` 데이터 소스 소속 여부
- 현재 상태
- 제목과 `작업 유형`
- 본문의 `배경`, `작업 범위`, `완료 조건`, `제외 범위`, `검증 계획`
- 기존 `GitHub PR`, `GitHub Branch`
- 연결할 GitHub Issue와 Issue 유형

하나라도 확인되지 않으면 코드, branch, PR을 변경하지 않는다. 확인되지 않은 Notion 값을 추측하거나 티켓을 읽고 갱신했다고 말하지 않는다.

## 티켓 준비

새 티켓의 `작업 유형`은 `기능`, `수정`, `문서`, `테스트`, `리팩터`, `설정`, `보안`, `운영` 중 하나를 선택한다. 본문은 아래 구조로 작성한다.

```markdown
## 배경

## 작업 범위

## 완료 조건

## 제외 범위

## 검증 계획

## 진행 메모
```

한 PR로 끝낼 작은 단계는 대표 티켓의 checklist로 관리한다. 독립적으로 리뷰·검증·merge할 작업만 티켓을 나눈다.

## 구현과 PR

1. 실제 구현을 시작할 때만 작업자가 `상태`를 `IN-progrss`로 바꾸고 `시작일`을 기록한다. 기존 철자를 그대로 사용한다.
2. 확정된 Issue 번호로 `<type>/<issue-number>-<short-slug>` branch를 만들고 티켓 범위만 구현한다.
3. 변경 목적별로 commit하고 필요한 검증을 실행한다.
4. ready PR을 default branch 대상으로 만들고 `Ticket:`에 검증한 Notion page URL을 넣는다.
5. 작업자는 `IN-review`, `GitHub PR`, `GitHub Branch`를 직접 기록하지 않는다. PR event sync가 기록하도록 둔다.
6. 작업자는 `DONE`, `Merged At`, `종료일`, push metadata, CI, review 결과를 직접 기록하지 않는다.

최초 PR 결속은 `GitHub PR`이 비어 있고 상태가 `IN-progrss`인 티켓에만 허용한다. `GitHub Branch`가 이미 있다면 PR head branch와 같아야 한다. 이미 결속된 티켓은 같은 PR URL, 같은 branch, `IN-review` 상태에서만 계속 동기화한다.

PR에 유효한 `Ticket:`이 한 번 결속되면 URL을 다른 티켓으로 바꾸지 않는다. PR 생성 시 URL이 없거나 잘못되어 첫 결속에 실패한 경우에만 처음으로 유효한 URL을 추가할 수 있다.

## 필드 소유권

- 작업자: 티켓 생성 내용, 구현 시작 시 `IN-progrss`와 `시작일`, 실제 외부 중단 사유의 수동 `Blocker`
- PR event sync: `IN-review`, `GitHub PR`, `GitHub Branch`, `PR Created At`, push metadata
- CI sync: `CI Status`, `Last CI Check`
- review sync: `Review Status`, `Last Review Check`
- merge sync: `DONE`, `Merged At`, `종료일`

merge sync는 CI 성공이나 review 통과를 추측해 기록하지 않는다. 상세 stale-event, fork, trusted-checkout, review 집계 규칙은 `docs/workflow/notion-ticket-db-schema.md`만 기준으로 삼는다.

## Blocker

정보 부족, 접근 권한, 외부 의존처럼 실제 진행을 멈추는 원인에만 수동 `Blocker`를 사용한다. 원인과 해제 조건을 함께 기록하고, 해제 조건을 확인한 주체만 지운다.

수동 `Blocker` 값은 보존한다. 실패한 CI나 review 상태를 `Blocker`에 중복 기록하지 않고 전용 필드를 확인한다.

자동화는 정확히 `PR closed without merge`인 값만 소유한다. merge 없이 닫힐 때 이 값을 기록하고, PR reopen 또는 merge 때도 정확히 그 값인 경우에만 지운다. 다른 수동 blocker는 자동으로 지우지 않는다.

## 완료 확인

- `Ticket:` URL, Issue, branch, default-branch base가 서로 맞는지 확인한다.
- merge 전 티켓 상태가 `IN-review`인지 확인하되 작업자가 직접 고치지 않는다.
- 사용자의 명시적 요청 없이 merge하거나 `main`에 직접 push하지 않는다.
- merge 후 `DONE` 처리는 GitHub Actions에 맡긴다.
