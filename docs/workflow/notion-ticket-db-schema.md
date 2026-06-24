# Notion Ticket DB Schema

이 문서는 nado 프로젝트에서 Notion `프로젝트` 데이터 소스를 작업 원장으로 사용할 때 필요한 속성, 상태 규칙, GitHub Actions 자동화 규칙을 정의한다.

## Data Source

- Notion data source: `프로젝트`
- Data source ID: GitHub Actions의 `NOTION_TICKETS_DATA_SOURCE_ID` 값으로 관리한다.
- Ticket page는 이 data source에 속해야 한다. GitHub Actions는 page를 갱신하기 전에 page parent가 `NOTION_TICKETS_DATA_SOURCE_ID`와 일치하는지 확인한다.
- Notion API는 data source parent를 안정적으로 확인하기 위해 `Notion-Version: 2025-09-03` 이상을 사용한다.
- Dashboard는 v1에서 별도 React 앱을 만들지 않고 Notion database view로 운영한다.

## Required Properties

| Property            | Type   | Purpose                                                  |
| ------------------- | ------ | -------------------------------------------------------- |
| `프로젝트 이름`     | Title  | 티켓 제목이다. 작업 범위를 한눈에 이해할 수 있어야 한다. |
| `상태`              | Status | 티켓의 현재 진행 상태다. 아래 상태값만 사용한다.         |
| `우선순위`          | Select | 기존 우선순위 값을 유지한다.                             |
| `담당자`            | Person | 작업 담당자를 표시한다.                                  |
| `작업 유형`         | Select | 티켓의 성격을 기능, 수정, 문서 등으로 분류한다.          |
| `시작일`            | Date   | 작업이 실제로 시작된 날짜다.                             |
| `종료일`            | Date   | PR merge 후 완료된 날짜다.                               |
| `GitHub PR`         | URL    | 연결된 GitHub Pull Request URL이다.                      |
| `GitHub Branch`     | Text   | 작업 브랜치 이름이다.                                    |
| `Last Push At`      | Date   | PR branch push를 마지막으로 반영한 시각이다.             |
| `Last Head SHA`     | Text   | 마지막으로 반영한 PR head commit SHA다.                  |
| `Last Push Summary` | Text   | 마지막 push가 어떤 PR/branch/SHA를 반영했는지 요약한다.  |
| `CI Status`         | Select | 연결된 PR의 CI/check 상태다.                             |
| `Review Status`     | Select | Codex 리뷰 또는 사람 리뷰의 현재 상태다.                 |
| `Blocker`           | Text   | 작업을 막는 원인이나 해제 조건이다.                      |
| `PR Created At`     | Date   | PR이 생성된 시각이다.                                    |
| `Merged At`         | Date   | PR이 merge된 시각이다.                                   |
| `Last CI Check`     | Date   | CI 상태를 마지막으로 확인한 시각이다.                    |
| `Last Review Check` | Date   | 리뷰 상태를 마지막으로 확인한 시각이다.                  |

## Work Type Values

`작업 유형`은 티켓 생성 시 반드시 하나를 선택한다. Codex가 티켓을 만들거나 사용자가 티켓 생성을 요청하면 아래 기준으로 고른다.

| 작업 유형 | When To Use                                             |
| --------- | ------------------------------------------------------- |
| `기능`    | 사용자가 새로 체감하는 기능이나 화면, 흐름을 추가한다.  |
| `수정`    | 버그, 깨진 동작, 잘못된 상태 전이를 바로잡는다.         |
| `문서`    | README, workflow 문서, 사용 가이드, 주석 중심 변경이다. |
| `테스트`  | 테스트 추가, 테스트 보강, 검증 자동화 개선이 중심이다.  |
| `리팩터`  | 외부 동작은 유지하고 내부 구조, 이름, 경계를 개선한다.  |
| `설정`    | 빌드, CI, 패키지, 앱 설정, 환경 구성을 바꾼다.          |
| `보안`    | secret, 권한, 인증/인가, 민감 정보 노출 위험을 줄인다.  |
| `운영`    | 배포, 모니터링, 알림, 반복 운영 절차를 개선한다.        |

## Status Values

`상태`는 현재 Notion 데이터 소스에 존재하는 값을 그대로 사용한다. 오타처럼 보이는 `IN-progrss`도 v1에서는 변경하지 않는다.

| 상태         | Meaning                       | When To Use                                                                |
| ------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `TODO`       | 아직 시작하지 않은 작업       | 새 티켓 생성 시 기본 상태다.                                               |
| `IN-progrss` | 구현이 진행 중인 작업         | Codex 또는 작업자가 티켓 기반 작업을 시작할 때 변경한다.                   |
| `IN-review`  | PR이 열려 있고 검토 중인 작업 | PR 생성 후 변경한다. CI 실패나 리뷰 수정 요청이 있어도 이 상태를 유지한다. |
| `DONE`       | PR이 merge되어 완료된 작업    | 연결된 PR이 실제로 merge된 뒤 GitHub Actions가 변경한다.                   |

## CI Status Values

| CI Status     | Meaning                                       |
| ------------- | --------------------------------------------- |
| `Not started` | 아직 PR 또는 CI 실행이 없다.                  |
| `Pending`     | CI/check가 실행 중이다.                       |
| `Success`     | 필수 CI/check가 모두 통과했다.                |
| `Failed`      | 하나 이상의 필수 CI/check가 실패했다.         |
| `Cancelled`   | CI/check가 취소되었다.                        |
| `Unknown`     | GitHub Actions가 현재 상태를 확인하지 못했다. |

## Review Status Values

| Review Status       | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `Not requested`     | 아직 리뷰가 요청되지 않았다.                       |
| `Pending`           | Codex 리뷰 또는 사람 리뷰가 진행 중이다.           |
| `Changes requested` | 해결해야 할 리뷰 의견이 남아 있다.                 |
| `Passed`            | 현재 확인 가능한 리뷰 문제가 없다.                 |
| `Unknown`           | GitHub Actions가 현재 리뷰 상태를 확인하지 못했다. |

## Dashboard Views

다음 view를 Notion `프로젝트` 데이터 소스에 둔다.

| View            | Type  | Purpose                                 |
| --------------- | ----- | --------------------------------------- |
| `Status Board`  | Board | `상태` 기준으로 전체 티켓 흐름을 본다.  |
| `Review Queue`  | Table | `IN-review` 티켓을 검토 대기열로 본다.  |
| `Blockers`      | Table | `Blocker`가 있는 티켓만 본다.           |
| `Recently Done` | Table | 완료된 티켓을 `종료일` 최신순으로 본다. |

## State Transition Rules

| Event                | 상태           | CI Status                  | Review Status       | Notes                                                                                                                  |
| -------------------- | -------------- | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 티켓 생성            | `TODO`         | `Not started`              | `Not requested`     | 아직 GitHub 작업이 없어야 한다.                                                                                        |
| 작업 시작            | `IN-progrss`   | `Not started`              | `Not requested`     | 브랜치를 만들면 `GitHub Branch`를 기록한다.                                                                            |
| PR 생성/업데이트     | `IN-review`    | GitHub Actions 결과        | `Pending`           | 현재 PR이 closed가 아닐 때만 갱신한다. `Ticket:` URL이 없으면 `Notion Ticket Sync` check가 실패한다.                   |
| PR 본문 수정         | 현재 상태 유지 | 현재 CI 상태 유지          | 현재 리뷰 상태 유지 | 현재 PR이 closed가 아닐 때만 `Ticket:` URL과 PR metadata를 확인하고 CI/review 상태를 덮어쓰지 않는다.                  |
| PR branch push       | `IN-review`    | `Pending`                  | `Pending`           | 현재 PR head SHA와 webhook payload SHA가 같을 때만 `Last Push At`, `Last Head SHA`, `Last Push Summary`를 기록한다.    |
| CI 실패              | `IN-review`    | `Failed`                   | 현재 리뷰 상태 유지 | 실패한 check 이름과 핵심 로그를 사용자에게 보고한다.                                                                   |
| CI 성공              | `IN-review`    | `Success`                  | 현재 리뷰 상태 유지 | CI 성공만으로 `DONE` 처리하지 않는다.                                                                                  |
| 리뷰 수정 요청       | `IN-review`    | 현재 CI 상태 유지          | `Changes requested` | `pull_request_review`의 명시적인 change request가 있을 때만 사용한다.                                                  |
| 리뷰 승인            | `IN-review`    | 현재 CI 상태 유지          | `Passed`            | 현재 PR review 목록을 pagination까지 조회해 활성 change request가 없을 때만 갱신한다. CI도 성공해야 merge 후보가 된다. |
| 리뷰 dismiss         | `IN-review`    | 현재 CI 상태 유지          | `Unknown`           | 기존 review 판단이 사라졌으므로 다시 확인해야 하는 상태로 둔다.                                                        |
| PR merge             | `DONE`         | `Success`                  | `Passed`            | `Merged At`과 `종료일`을 기록한다.                                                                                     |
| PR 닫힘, merge 안 됨 | 현재 상태 유지 | `Cancelled` 또는 `Unknown` | 현재 리뷰 상태 유지 | `Blocker`에 `PR closed without merge`를 기록한다.                                                                      |

## GitHub Actions Requirements

GitHub Actions의 `Notion Ticket Sync` workflow는 다음 값이 있어야 동작한다.

- Repository secret: `NOTION_TOKEN`
- Repository variable 또는 secret: `NOTION_TICKETS_DATA_SOURCE_ID`
- Built-in token: `GITHUB_TOKEN`

`NOTION_TOKEN`은 PR branch에서 checkout한 코드에 주입하지 않는다. Notion 동기화는
`.github/workflows/notion-ticket-sync.yml`에서 `pull_request_target`, `pull_request_review`,
또는 `workflow_run` 이벤트로 실행하며, base/default branch에서 checkout한 trusted code의
`scripts/notion-ticket-sync.mjs`만 실행한다.

`pull_request_review` 이벤트는 same-repository PR에서만 Notion token을 사용한다. fork PR은
secret 노출과 권한 혼선을 피하기 위해 Notion sync 대상에서 제외한다.
review approval 이벤트는 단일 이벤트만 믿지 않고 GitHub reviews API로 reviewer별 최신 상태를 확인한다.
GitHub reviews API는 `per_page=100`으로 조회하고 `Link` header의 `rel="next"` pagination을
끝까지 따라간 뒤 집계한다. reviewer별 상태 집계에서는 `APPROVED`, `CHANGES_REQUESTED`,
`DISMISSED`만 결정적 review 상태로 보고, `COMMENTED`는 이전 change request를 해제하지 않는다.
활성 `CHANGES_REQUESTED` 리뷰가 하나라도 남아 있으면 `Review Status`를 `Passed`로 내리지 않는다.

이 workflow를 추가하는 PR처럼 base/default branch의 trusted checkout에 아직
`scripts/notion-ticket-sync.mjs`가 없으면 Notion sync step은 성공적으로 skip한다. merge 이후
trusted branch에 script가 존재하면 같은 workflow가 실제 동기화를 수행한다.

PR 본문의 `## Notion Ticket` 섹션에는 다음 형식의 Notion page URL이 있어야 한다.

```markdown
- Ticket: https://app.notion.com/p/...
```

same-repository PR에서 티켓 URL이 없으면 Notion 원장을 신뢰할 수 없으므로 sync check는 실패한다.
GitHub Actions는 URL에서 page ID를 추출한 뒤 해당 page가 `NOTION_TICKETS_DATA_SOURCE_ID`로
설정된 data source에 속하는지 확인하고, 다른 data source의 page면 갱신하지 않는다.

## Ticket Body Template

티켓 본문에는 최소한 다음 항목을 채운다. 내용이 짧아도 각 항목의 의도가 분명해야 한다.

```markdown
## 배경

## 작업 유형

## 작업 범위

## 완료 조건

## 제외 범위

## 검증 계획

## 진행 메모
```

GitHub Actions는 PR branch push가 감지되면 현재 PR head SHA를 조회한다. webhook payload의 head SHA가
현재 PR head SHA와 같을 때만 `Last Push At`, `Last Head SHA`, `Last Push Summary` 속성을 자동 갱신한다.
더 오래된 `pull_request synchronize` job이 늦게 끝나면 stale 이벤트로 보고 Notion 업데이트를 skip한다.
`closed`를 제외한 `pull_request_target` 이벤트는 Notion 업데이트 전에 현재 PR 상태를 다시 조회한다. 현재 PR이
이미 closed이면 stale 이벤트로 보고 `IN-review`, PR metadata, push metadata를 다시 쓰지 않는다.
본문 `진행 메모`에 장문의 히스토리를 쌓는 것은 v2.1 이후 필요할 때 추가한다.

## Merge Completion Rule

티켓은 다음 조건을 모두 만족할 때만 `DONE`으로 변경한다.

- 연결된 PR이 실제로 merge되었다.
- GitHub Actions에서 `Notion Ticket Sync`가 merge 이벤트를 처리했다.
- `GitHub PR` 속성에 merge된 PR URL이 기록되어 있다.

AI 작업 세션과 repo-local skill은 PR 생성 후 `IN-review`까지만 처리한다. `DONE` 전환은 merge 이벤트를 놓치지 않기 위해 GitHub Actions가 담당한다.
