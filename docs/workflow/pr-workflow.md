# PR 작성과 리뷰

PR은 변경 목적, 검증 결과, 리뷰 포인트를 공유하는 단위다. 실제 형식은 [PR template](../../.github/pull_request_template.md)을 따른다.

## Ready와 Draft

| 방식  | 사용하는 경우                                         |
| ----- | ----------------------------------------------------- |
| Ready | 확정된 Issue 작업을 마치고 새 PR을 만들 때 기본값     |
| Draft | 사용자가 명시했거나 범위 검토가 먼저 필요할 때만 사용 |

## 제목

```text
<종류>: <한국어 요약>
```

예시: `수정: 계정 전환 시 분석 상태 격리`

## 본문

본문 항목은 이 문서에 복사하지 않고 [실제 PR template](../../.github/pull_request_template.md)을 사용한다. 작성할 때 아래 계약만 놓치지 않는다.

- 같은 저장소에서 만든 PR은 `Ticket:`에 Notion 티켓 URL을 넣는다.
- 요약에는 변경 목적과 핵심 결과를 적는다.
- 검증에는 실제로 실행한 명령만 체크하고, 실행하지 못한 항목은 이유를 적는다.
- 영향 범위와 리뷰어가 특히 확인할 부분을 적는다.
- 마지막에 작업 단위에 맞는 `Closes`, `Refs`, `Parent`를 적는다.

### Notion Ticket 결속

- PR을 만들기 전에 티켓이 `프로젝트` 데이터 소스에 속하고 상태가 `IN-progrss`이며 기존 `GitHub PR`이 비어 있는지 확인한다.
- 티켓의 기존 `GitHub Branch`가 비어 있지 않다면 PR head branch와 같아야 한다.
- PR base는 저장소 default branch로 지정한다.
- 최초 결속 전에 data source에서 현재 PR URL에 이미 연결된 다른 티켓이 없는지 확인한다.
- 최초 유효한 `Ticket:` URL이 PR에 결속되면 다른 티켓 URL로 바꾸지 않는다.
- URL을 비웠다가 다른 티켓을 넣는 방식으로도 기존 결속을 바꿀 수 없다. 같은 Notion page ID를 가리키는 URL 표기 변경만 허용한다.
- PR 생성 시 `Ticket:`이 없거나 URL이 잘못되었거나 이전 티켓의 결속 검증이 실패한 경우에는 영속 결속이 없을 때만 첫 유효 URL을 추가할 수 있다. 유효한 티켓 A를 유효한 티켓 B로 바꾸는 편집은 허용하지 않는다.
- 이미 결속된 티켓은 같은 PR URL, 같은 branch, `IN-review` 상태여야 한다.

same-repository PR에서 URL이 없거나 잘못되었거나 다른 데이터 소스에 속하거나 결속 조건이 맞지 않으면 `Notion Ticket Sync` check가 실패하고 Notion을 갱신하지 않는다. 이 경우 새 티켓으로 바꾸지 말고 원래 티켓의 상태와 결속 정보를 확인한다.

작업자는 PR 생성 후 `IN-review`, `GitHub PR`, `GitHub Branch`를 직접 기록하지 않는다. GitHub Actions가 현재 PR을 검증한 뒤 기록한다. 상세 계약은 [Notion 자동화 계약](notion-ticket-db-schema.md)을 따른다.

## Issue 연결

| 작업 단위       | PR 마지막 줄                                   |
| --------------- | ---------------------------------------------- |
| 일반 Issue      | `Closes #42`                                   |
| cohesive parent | `Closes #40`와 세부 checklist 또는 `Refs #...` |
| 독립 sub-issue  | `Closes #42`와 `Parent: #40`                   |

tracking parent를 직접 닫는 PR은 만들지 않는다.

## 검증 선택

기본 명령과 최초 E2E 준비는 [로컬 개발 안내](../setup/local-development.md)를 따른다. 변경 범위에 따라 더 좁은 검증을 먼저 실행해도 되지만, 최종 PR에는 필요한 전체 검증 결과를 남긴다.

### Storybook 검증 기준

Storybook 전용 build는 아직 별도 필수 check로 분리하지 않았으므로 Storybook 또는 공통 UI를 변경한 PR에서 아래 검증을 직접 실행하고 결과를 남긴다.

| 변경 범위            | 추가 확인                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Storybook story·설정 | Storybook source test, typecheck, lint, build                                                     |
| Web/Desktop 공통 UI  | `pnpm --filter @nado/ui-web test`, `pnpm --filter @nado/ui test`, 관련 Storybook test와 화면 확인 |
| Mobile UI·token      | `pnpm --filter @nado/mobile test`와 Mobile demo 확인                                              |

Storybook/UI 변경 PR은 구조 계약, 타입, production build와 필요한 화면 확인 결과를 PR 본문에 남긴다. 구체적인 실행 기준은 [Storybook 운영 기준](../../apps/storybook/README.md)을 따른다.

## Codex review

1. ready PR을 만든다.
2. 사용자가 PR 화면에서 최신 head commit 기준 자동 리뷰를 확인한다.
3. 결과가 없거나 재검토가 필요하면 사용자가 `@codex review`를 요청한다.
4. 사용자가 리뷰 반영을 요청하면 같은 branch에서 수정·검증·commit·push한다.

AI는 Codex 설정 UI를 확인하거나 merge하지 않는다. 리뷰 제안이 요구사항과 충돌하면 사용자에게 먼저 확인한다.

## Merge 전 확인

- `Ticket:`과 닫을 Issue가 정확한가?
- PR base가 저장소 default branch인가?
- 검증 결과와 실행하지 못한 이유가 남아 있는가?
- 관련 없는 변경과 secret이 없는가?
- 현재 head의 CI와 리뷰 상태를 확인했는가?

merge는 사용자가 수행한다. 가능하면 저장소의 기본 merge 방식을 따른다. merge sync는 완료 결과로 Notion의 `DONE`과 merge 날짜만 기록하며, 자동 close blocker 정리를 제외하고 CI 성공이나 review 통과를 추측해 덮어쓰지 않는다.
