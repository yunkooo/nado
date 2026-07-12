# 협업 워크플로

이 문서는 Notion 티켓, GitHub Issue, branch, commit, PR이 어떻게 연결되는지 설명한다. AI의 구체적인 행동 규칙은 루트 [AGENTS.md](../../AGENTS.md)가 최종 기준이다.

## 문서 역할

| 문서                                             | 확인할 내용                       |
| ------------------------------------------------ | --------------------------------- |
| 이 문서                                          | 전체 작업 순서와 작업 단위        |
| [Issue 작성](issue-workflow.md)                  | 문제, 범위, 완료 조건             |
| [PR 작성과 리뷰](pr-workflow.md)                 | PR 본문, 검증, 리뷰, merge        |
| [Notion 자동화 계약](notion-ticket-db-schema.md) | 상태값, 필수 속성, GitHub Actions |

실제 입력 형식은 아래 파일이 기준이다.

- [Issue form](../../.github/ISSUE_TEMPLATE/task.yml)
- [PR template](../../.github/pull_request_template.md)

## 한눈에 보는 흐름

```text
Notion 티켓 준비
→ GitHub Issue 작성과 작업 단위 판단
→ 티켓을 IN-progrss로 옮기고 Issue·default branch 확인
→ Issue 번호로 branch 생성
→ 구현·검증·목적별 commit
→ Ticket URL과 Closes가 포함된 ready PR 생성
→ CI·Notion·Slack 자동화
→ 리뷰 반영
→ 사용자 merge
→ GitHub Actions가 Notion DONE 처리
```

## 작업 단위 판단

일반 Issue, 한 PR로 묶을 작업, 여러 독립 작업을 추적할 상위 Issue를 먼저 구분한다. 용어와 판단 기준은 [Issue 작성의 작업 크기 분류](issue-workflow.md#작업-크기-분류)에서 한 번만 관리한다.

branch를 만들기 전 연결할 Issue와 유형을 확정한다. tracking parent에는 branch를 만들지 않으며, 작업 branch와 PR은 저장소 default branch를 기준으로 한다.

## Branch와 commit

Issue 작업 branch 기본 형식:

```text
<type>/<issue-number>-<short-slug>
```

예시:

```text
feat/42-vocabulary-search
fix/57-desktop-oauth-callback
docs/61-simplify-workflow
```

commit은 파일 수가 아니라 변경 목적을 기준으로 나눈다.

```text
<종류>: <한국어 요약>
```

일반 커밋 요청은 push를 포함하지 않는다. 다만 확정된 Issue의 PR 작업 요청은 branch push와 ready PR 생성을 포함한다.

## 자동화

| 자동화                                                                     | 역할                                     |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [CI](../../.github/workflows/ci.yml)                                       | 정적 검증, native smoke, E2E             |
| [Notion Ticket Sync](../../.github/workflows/notion-ticket-sync.yml)       | PR, CI, 리뷰, merge 상태를 Notion에 반영 |
| [Review signal](../../.github/workflows/notion-ticket-review-dispatch.yml) | secret 없이 review event 신호만 전달     |
| [Slack PR 알림](../../.github/workflows/slack-pr-notify.yml)               | ready PR의 리뷰 요청 알림                |
| [Dependabot](../../.github/dependabot.yml)                                 | 보안 업데이트 지원, 일반 업데이트 수동화 |

same-repository PR은 PR 본문의 `Ticket:`에 Notion `프로젝트` 데이터 소스의 `IN-progrss` 티켓 URL을 넣어야 한다. 최초 결속 후 URL을 비우거나 다른 티켓으로 바꿀 수 없으며, 같은 Notion page ID의 URL 표기 변경만 허용한다. URL이 없거나 잘못되었거나 다른 데이터 소스의 페이지이거나 결속 조건이 맞지 않으면 Notion sync check가 실패하고 Notion을 갱신하지 않는다.

Dependabot Alerts와 security update는 유지하고, 일반 version update PR 자동 생성은 비활성화한다. 일반 dependency update는 월 1회 대표 유지보수 티켓에서 outdated 목록과 release note를 검토하며, 독립적으로 검증·merge할 변경만 별도 티켓과 PR로 분리한다.

Security update PR도 same-repository PR이므로 merge 전에 `IN-progrss` Notion 티켓을 만들고 PR 본문의 `Ticket:`에 연결한다.

작업자는 구현 시작 시 `IN-progrss`와 `시작일`까지만 기록한다. `IN-review`, PR·branch·push metadata, CI, review, merge 결과는 각 GitHub Actions sync가 기록한다. merge sync는 CI 성공이나 review 통과를 추측하지 않는다. 필드별 소유권은 [Notion 자동화 계약](notion-ticket-db-schema.md)을 따른다.

## `main` 보호 규칙

`main`에는 GitHub branch protection을 적용한다.

- PR을 통해서만 변경한다.
- branch를 최신 `main` 기준으로 갱신한 뒤 merge한다.
- `Lint, typecheck, test, build`, `Supabase migrations and database tests`, `E2E smoke`, `Sync PR event` check를 필수로 둔다.
- 모든 review conversation이 해결되어야 merge할 수 있다.
- force push와 branch 삭제를 허용하지 않는다.
- 1인 운영 중에는 승인 수를 강제하지 않고, 협업자가 생기면 required approval을 추가한다.
- 저장소 Actions는 GitHub 소유 Action과 저장소 local action만 허용한다.
- 원격 Action의 `uses:` 참조는 버전 주석과 함께 full commit SHA로 고정한다.
- Slack 알림은 보조 수단이므로 required check에 포함하지 않는다.

Mobile native generation/export와 Desktop Tauri compile은 `Lint, typecheck, test, build` check 안에서 실행된다.

## Codex review

- 새 PR은 기본적으로 ready 상태로 만든다.
- 저장소 Codex 설정은 사용자가 `자동 코드 검토: 켜기`, `Review trigger: 매 푸시마다`인지 확인한다.
- AI는 설정 UI를 직접 확인하거나 변경하지 않는다.
- 자동 리뷰가 없거나 재검토가 필요하면 사용자가 PR 댓글에 `@codex review`를 남긴다.
- 리뷰 반영은 사용자가 `PR #번호 리뷰 반영해줘`라고 요청했을 때 진행한다.
- merge는 사용자가 결정한다.

## 자주 쓰는 요청

```text
분석 오류 처리 issue 만들어줘
#42 issue 작업해줘
PR #43 리뷰 반영해줘
현재 변경사항을 목적별로 커밋해줘
푸시해줘
```

Issue 생성 요청은 코드를 수정하라는 뜻이 아니다. 특정 Issue 작업 요청은 먼저 Issue 유형과 현재 작업tree를 확인한 뒤 진행한다.
