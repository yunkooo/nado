# Notion 티켓 자동화 계약

Notion `프로젝트` 데이터 소스는 작업 원장이다. 이 문서는 사람이 입력할 값과 GitHub Actions가 자동으로 갱신할 값을 구분한다.

## 일반 작업자가 알아야 할 내용

### Data source

- Data source 이름: `프로젝트`
- ID 관리: GitHub Actions의 `NOTION_TICKETS_DATA_SOURCE_ID`
- API version: `Notion-Version: 2025-09-03` 이상
- PR의 `Ticket:` page는 반드시 이 data source에 속해야 한다.

### 직접 작성하는 값

| Property        | Notion type | 용도                                               |
| --------------- | ----------- | -------------------------------------------------- |
| `프로젝트 이름` | Title       | 작업 제목                                          |
| `상태`          | Status      | 작업자는 `TODO`에서 `IN-progrss`까지만 변경        |
| `우선순위`      | Select      | 기존 Notion 값 사용                                |
| `담당자`        | Person      | 작업 담당자                                        |
| `작업 유형`     | Select      | 기능, 수정, 문서, 테스트, 리팩터, 설정, 보안, 운영 |
| `시작일`        | Date        | 실제 작업 시작일                                   |
| `Blocker`       | Rich text   | 실제 외부 중단 사유와 해제 조건을 수동 기록        |

`IN-progrss`는 오타처럼 보여도 현재 database 값이므로 그대로 사용한다.

티켓 본문에는 아래 항목을 작성한다.

```markdown
## 배경

## 작업 범위

## 완료 조건

## 제외 범위

## 검증 계획

## 진행 메모
```

한 PR로 처리할 작은 단계는 여러 티켓으로 나누지 않고 Notion 대표 티켓의 checklist에 넣는다. 독립적으로 리뷰·검증·merge할 작업만 별도 티켓으로 만든다.

### Notion에 접근할 수 없을 때

Notion page를 직접 조회할 수 없으면 사용자에게 아래 값을 모두 확인받는다.

- ticket URL과 `프로젝트` data source 소속 여부
- 현재 `상태`
- `프로젝트 이름`과 `작업 유형`
- 본문의 `배경`, `작업 범위`, `완료 조건`, `제외 범위`, `검증 계획`
- 기존 `GitHub PR`, `GitHub Branch`
- 연결할 GitHub Issue와 Issue 유형

모든 값을 확인받기 전에는 코드, branch, PR을 변경하지 않는다. 접근하지 못한 티켓을 읽었거나 갱신했다고 말하지 않는다.

### 상태 흐름

```text
TODO → IN-progrss → IN-review → DONE
```

| 이벤트               | 상태         | 작성 주체와 비고                                  |
| -------------------- | ------------ | ------------------------------------------------- |
| 티켓 생성            | `TODO`       | 작업자가 내용 작성                                |
| 작업 시작            | `IN-progrss` | 작업자가 `시작일`과 함께 기록                     |
| 최초 PR 결속         | `IN-review`  | PR event sync가 branch·PR과 함께 기록             |
| PR 업데이트          | `IN-review`  | PR event sync가 유지하고 기존 CI·리뷰 상태는 보존 |
| CI·리뷰 완료         | `IN-review`  | 전용 sync가 결과를 기록하며 DONE 처리하지 않음    |
| PR merge             | `DONE`       | merge event sync만 처리                           |
| PR close, merge 아님 | 상태 유지    | 자동 blocker만 기록하고 수동 값은 보존            |

AI와 작업자는 상태 흐름에서 실제 구현을 시작할 때 `IN-progrss`와 `시작일`까지만 갱신한다. 실제 외부 중단 사유의 수동 `Blocker`는 아래 수명주기를 따른다. `IN-review`, `DONE`, PR metadata, CI, review, merge 날짜는 각 GitHub Actions sync가 담당한다.

### PR 계약

PR 본문은 다음 형식을 포함한다.

```markdown
## Notion Ticket

- Ticket: https://app.notion.com/...
```

최초 결속은 아래 조건을 모두 만족해야 한다.

- PR base가 저장소 default branch다.
- 티켓이 설정된 `프로젝트` data source에 속한다.
- 티켓 상태가 `IN-progrss`다.
- `GitHub PR`이 비어 있다.
- `GitHub Branch`가 비어 있거나 현재 PR head branch와 같다.

최초 결속 전에는 `GitHub PR` URL로 data source를 역조회해 같은 PR에 이미 결속된 다른 티켓이 없는지 확인한다. 조회 결과가 다음 page를 가리키면 `next_cursor`를 따라가며, 두 번째 결속을 찾거나 결과가 끝날 때까지 확인한다. cursor가 없거나 반복되는 비정상 pagination 응답은 안전하게 실패시킨다. PR event sync는 결속 변경이 경합하지 않도록 전체 PR event job을 순서대로 처리한다.

이미 결속된 티켓은 `GitHub PR`이 현재 PR URL과 같고, `GitHub Branch`가 현재 head branch와 같고, 상태가 `IN-review`일 때만 계속 동기화한다. merge된 동일 PR의 중복 close event는 같은 결속의 `DONE` 티켓에 대해 idempotent하게 처리할 수 있다.

유효한 `Ticket:` URL이 한 번 결속되면 다른 티켓 URL로 바꿀 수 없다. URL을 비웠다가 다른 티켓을 넣거나 변경된 본문으로 이전 `opened` event를 다시 실행해도 기존 결속을 바꾸지 않는다. 같은 page ID를 가리키는 URL 표기 변경은 허용한다. PR 생성 시 URL이 없거나 형식이 잘못되었거나 이전 티켓의 결속 검증이 실패한 경우에는 영속 결속이 없을 때만 첫 유효 URL을 추가할 수 있다. 유효한 티켓 A에서 유효한 티켓 B로 바꾸는 편집은 data source의 기존 결속을 확인한 뒤 Notion page를 갱신하기 전에 거부한다.

same-repository PR에서 URL이 없거나, 다른 data source의 page이거나, URL 형식이 잘못되거나, 위 결속 조건이 맞지 않으면 sync check가 실패하고 Notion을 갱신하지 않는다.

## 자동화 유지보수자가 알아야 할 내용

아래 내용은 GitHub Actions나 Notion 동기화 코드를 바꿀 때 확인한다.

### 자동 갱신 값

| Property                             | Notion type | 작성 주체                                      |
| ------------------------------------ | ----------- | ---------------------------------------------- |
| `상태`의 `IN-review`                 | Status      | 최초 PR event sync                             |
| `GitHub PR`                          | URL         | PR event sync                                  |
| `GitHub Branch`                      | Rich text   | PR event sync                                  |
| `PR Created At`                      | Date        | PR event sync                                  |
| `Last Push At`                       | Date        | 최신 branch push sync                          |
| `Last Head SHA`, `Last Push Summary` | Rich text   | 최신 branch push sync                          |
| `CI Status`                          | Select      | CI `workflow_run` sync                         |
| `Last CI Check`                      | Date        | CI `workflow_run` sync                         |
| `Review Status`                      | Select      | `pull_request_review` signal 이후 review sync  |
| `Last Review Check`                  | Date        | review sync                                    |
| `Merged At`, `종료일`                | Date        | merge event sync                               |
| `상태`의 `DONE`                      | Status      | merge event sync                               |
| `Blocker`의 예약값                   | Rich text   | merge 없이 닫힌 PR의 `PR closed without merge` |

Select option은 이름까지 정확히 만든다.

- `CI Status`: `Not started`, `Pending`, `Success`, `Failed`, `Cancelled`, `Unknown`
- `Review Status`: `Not requested`, `Pending`, `Changes requested`, `Passed`, `Unknown`

### 필요한 GitHub 값

- Repository secret: `NOTION_TOKEN`
- Repository variable 또는 secret: `NOTION_TICKETS_DATA_SOURCE_ID`
- Built-in token: `GITHUB_TOKEN`

Notion `프로젝트` data source와 연결할 티켓 page를 `NOTION_TOKEN`에 해당하는 integration에 공유한다.

`NOTION_TOKEN`은 PR branch나 신뢰되지 않은 base branch에서 checkout한 코드에 전달하지 않는다.

### 자동화 안전 규칙

#### 신뢰할 수 있는 코드만 실행

- secret-bearing sync는 `pull_request_target` 또는 `workflow_run`에서 default branch 코드를 checkout한다.
- PR base가 default branch인 경우에만 Notion을 갱신한다.
- CI-result sync도 fetch한 PR base가 default branch가 아니면 갱신하지 않는다.
- fork PR은 sync 대상에서 제외한다.
- GitHub API에서 `head.repo`가 없거나 `null`인 PR도 fork PR처럼 제외한다.

#### Review signal과 집계

- `pull_request_review`는 secret 없는 read-only signal job에서만 받는다.
- signal job은 `actions: write` 권한을 받지 않고 `NOTION_TOKEN`도 사용하지 않는다.
- secret-bearing workflow가 `workflow_run`으로 이 signal workflow의 완료를 받은 뒤 현재 PR과 review를 다시 조회한다.
- Reviews API는 `per_page=100`과 pagination을 사용한다.
- `APPROVED`, `CHANGES_REQUESTED`, `DISMISSED`만 결정 상태로 사용하고 `COMMENTED`는 이전 요청을 해제하지 않는다.
- 활성 change request가 있으면 `Passed`로 기록하지 않는다.
- 현재 결정 상태가 dismissed-only이면 `Review Status = Unknown`으로 기록한다.

#### 오래된 이벤트 무시

- PR event sync job은 전역 concurrency group과 `queue: max`로 직렬화해 서로 다른 PR의 최초 결속도 동시에 쓰지 않는다.
- 정상적인 `IN-progrss` 티켓에서 CI 또는 review 결과가 최초 PR 결속보다 먼저 도착하면 해당 결과 sync는 성공적으로 건너뛴다. PR event sync가 결속을 만든 뒤 이후 결과 event가 전용 필드를 갱신하며, 필수 속성 누락이나 잘못된 상태·PR·branch는 계속 실패한다.
- `pull_request_target` 이벤트는 Notion 업데이트 전에 현재 PR 상태를 다시 조회한다.
- 이미 닫힌 PR의 오래된 opened·synchronize event는 상태를 되돌리지 않는다.
- PR이 다시 열려 있으면 오래된 close event로 `PR closed without merge` blocker를 쓰지 않는다.
- webhook SHA와 현재 PR head SHA가 같을 때만 push metadata를 기록한다.
- 더 오래된 `pull_request synchronize` job은 skip한다.
- 같은 SHA의 CI가 여러 번 실행되면 최신 run/attempt만 사용한다.

#### 상태 소유권 분리

- 작업자는 구현 시작 시 `IN-progrss`와 `시작일`까지만 기록한다.
- PR event sync만 `IN-review`, `GitHub PR`, `GitHub Branch`, `PR Created At`, push metadata를 기록한다.
- PR event는 `Review Status`를 `Pending`으로 되돌리지 않는다.
- PR event는 `CI Status`를 `Pending`으로 되돌리지 않는다.
- review 결과는 review sync만, CI 결과는 CI sync만 기록한다.
- merge event sync는 완료 결과로 `DONE`, `Merged At`, `종료일`만 기록한다. 아래 수명주기에 해당하는 자동 blocker 정리를 제외하고, CI 성공이나 review 통과를 추측하거나 기존 값을 덮어쓰지 않는다.
- `workflow_run.pull_requests`가 비어 있어도 `workflow_run.head_repository`가 다른 저장소면 fork로 판단한다.

#### Blocker 수명주기

- 수동 `Blocker`는 정보 부족, 접근 권한, 외부 의존처럼 실제 진행을 멈추는 원인에만 사용한다. 원인과 해제 조건을 함께 기록하고, 해제 조건을 확인한 주체만 지운다.
- 수동으로 작성한 `Blocker` 값은 자동화가 덮어쓰거나 지우지 않는다.
- 자동화는 공백을 포함한 원문이 정확히 `PR closed without merge`인 값만 소유한다.
- 현재 PR이 merge 없이 닫힌 경우에만 이 값을 기록한다. 수동 blocker가 이미 있으면 보존한다.
- PR이 reopen되거나 merge되면 현재 값이 정확히 `PR closed without merge`일 때만 비운다.
- 일반 opened·edited·synchronize, CI, review 이벤트는 `Blocker`를 비우지 않는다.
- 실패한 CI와 미해결 review는 `CI Status`, `Review Status`에서 관리하고 `Blocker`에 중복 기록하지 않는다.

trusted checkout에 sync script가 아직 없으면 workflow는 성공적으로 skip한다.

## 완료 조건

티켓은 연결된 PR이 실제로 merge되고 Notion Ticket Sync가 merge event를 처리했을 때만 `DONE`이 된다. CI 성공이나 review 승인만으로 완료 처리하지 않는다.
