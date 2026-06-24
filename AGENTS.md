# AGENTS.md

이 파일은 저장소 루트 기준으로 전체 프로젝트에 적용한다. 하위 폴더에 별도 `AGENTS.md`가 생기면 더 가까운 파일의 규칙을 우선한다.

## 기본 원칙

- 사용자와의 대화, 작업 요약, 문서 작성은 기본적으로 한국어로 한다.
- 기존 코드와 문서의 구조를 먼저 확인한 뒤 변경한다.
- 요청 범위 밖의 리팩터링이나 파일 정리는 하지 않는다.
- 사용자가 만들었을 수 있는 변경사항을 임의로 되돌리지 않는다.
- 민감 정보, API key, token, `.env` 값은 커밋하지 않는다.

## React/Next.js 작업 규칙

- React/Next.js 코드 작성, 리뷰, 리팩터링, 성능 개선 작업을 할 때는 먼저 `.agent-skills/react-best-practices/AGENTS.md`를 확인하고 해당 지침을 이 프로젝트의 추가 규칙으로 적용한다.
- 세부 규칙이나 예시가 필요하면 `.agent-skills/react-best-practices/rules/`의 개별 rule 문서를 함께 확인한다.
- 적용 우선순위는 Vercel React Best Practices의 순서에 따른다: 비동기 waterfall 제거, 번들 크기 최적화, 서버 사이드 성능, 클라이언트 데이터 fetching, re-render 최적화, 렌더링 성능, JavaScript 성능, 고급 패턴.
- 단, 사용자 직접 요청과 이 파일의 기본 원칙이 우선이며, 현재 코드 구조와 프로젝트 단계에 맞지 않는 과도한 최적화는 하지 않는다.
- `useMemo`, `useCallback`, `memo`, `useRef` 같은 최적화성 API는 실제 병목이나 명확한 렌더링/상태 경계 문제가 있을 때 근거를 남기고 사용한다.

## GitHub Issue/PR 작업 규칙

- GitHub Issue, branch, PR, 리뷰 반영 작업을 할 때는 먼저 `docs/workflow/README.md`를 확인하고 필요한 세부 문서를 함께 따른다.
- Issue 생성 요청을 받으면 코드를 수정하지 않고 Issue의 작업 내용, 이유, 완료 조건, 제외 범위를 먼저 정리한다.
- `#<번호> issue 작업해줘`처럼 특정 Issue 작업 요청을 받으면 먼저 해당 Issue가 일반 Issue, cohesive parent issue, tracking parent issue, 독립 sub-issue 중 무엇인지 확인한다.
- 일반 Issue, cohesive parent issue, 독립 sub-issue만 PR 작업 단위로 보고 branch 1개와 PR 1개를 만든다.
- tracking parent issue는 직접 branch/PR을 만들지 않고, GitHub native sub-issue 선택 또는 생성/연결을 먼저 사용자에게 요청한다.
- tracking parent issue의 진행률은 GitHub native sub-issue 연결을 우선 기준으로 보고, Markdown checklist는 후보 정리나 fallback 메모로만 사용한다.
- PR 작업 단위로 확정된 Issue 작업 요청은 해당 branch를 원격에 push하고 PR을 생성해도 된다는 요청으로 간주한다.
- Issue 작업을 위해 branch를 만들 때는 AI가 생성하더라도 `<type>/<issue-number>-<short-slug>` 형식을 기본으로 한다. 큰 cohesive 작업은 parent issue 번호를 사용할 수 있고, 독립적으로 리뷰/검증/merge 가능한 sub-issue 작업은 sub-issue 번호를 사용한다.
- Issue는 작업의 추적 단위이고, commit은 변경 목적의 단위다. 하나의 Issue 작업 안에서도 목적이 다르면 여러 commit으로 분리한다.
- PR 본문에는 관련 Issue를 닫는 `Closes #<번호>` 문구를 포함한다. Parent issue 기준 PR 1개 흐름에서는 `Closes #<parent>`와 세부 체크리스트 또는 `Refs #<sub-issue>`를 사용하고, 독립 sub-issue PR에서는 `Closes #<sub-issue>`와 `Parent: #<parent>`를 사용한다. `Parent:` 표기는 native sub-issue 연결을 대체하지 않는 보조 맥락 표기다.
- PR 작업 단위로 확정된 Issue 작업으로 새 PR을 만들 때는 기본적으로 ready 상태로 만들고 Codex review가 시작되도록 한다.
- 이 저장소의 Codex code review 설정은 개인 기본 설정 상속 대신 저장소 row에서 `자동 코드 검토`를 명시적으로 켜고, `Review trigger`를 `매 푸시마다`로 고정하는 것을 기준으로 한다.
- AI는 Codex 설정 UI를 직접 확인하거나 변경할 수 없으므로, 설정 상태가 불명확하면 사용자에게 확인한다.
- 저장소 Codex automatic review가 켜져 있으면 PR 생성 또는 ready 전환 후 Codex review 대상이 된다.
- AI는 Codex review 생성을 고정 시간 동안 지켜보지 않는다. 사용자가 필요할 때 PR 화면에서 최신 head commit 기준 Codex review 여부를 확인하고, 결과가 없거나 다시 확인이 필요하면 PR 댓글로 `@codex review`를 직접 요청하도록 안내한다.
- AI는 기본 PR 생성 흐름에서 `@codex review` 댓글을 대신 남기지 않는다.
- Draft PR은 사용자가 명시적으로 요청한 경우에만 만들며, ready 전환 시 Codex automatic review 대상이 된다.
- 리뷰 수정은 사용자가 `PR #<번호> 리뷰 반영해줘`처럼 명시적으로 요청했을 때만 진행한다.
- AI는 PR 생성과 리뷰 반영까지 도울 수 있지만, 사용자의 명시적 요청 없이 merge하거나 `main`에 직접 push하지 않는다.
- Issue나 PR 요구사항이 모호하거나 현재 작업tree에 관련 없는 변경사항이 있으면 작업을 시작하기 전에 사용자에게 확인한다.

## Notion Ticket 작업 규칙

- Notion 티켓 기반 작업 요청을 받으면 먼저 `.agents/skills/notion-ticket-pr-loop/SKILL.md`와 `docs/workflow/notion-ticket-db-schema.md`를 확인한다.
- v1의 작업 원장은 Notion `프로젝트` 데이터 소스이며, data source ID는 GitHub Actions의 `NOTION_TICKETS_DATA_SOURCE_ID` 값으로만 관리한다.
- 현재 상태값은 그대로 사용한다: `TODO`, `IN-progrss`, `IN-review`, `DONE`.
- 상태 흐름은 `TODO` -> `IN-progrss` -> `IN-review` -> `DONE`이다.
- Notion 티켓을 만들 때는 `작업 유형`을 기능, 수정, 문서, 테스트, 리팩터, 설정, 보안, 운영 중 하나로 고르고, 배경, 작업 범위, 완료 조건, 제외 범위, 검증 계획을 본문에 적는다.
- Codex 또는 작업자는 작업 시작 시 `IN-progrss`, PR 생성/업데이트 시 `IN-review`까지만 처리한다.
- `DONE`, `Merged At`, `종료일` 처리는 GitHub Actions의 merge 이벤트 동기화만 담당한다.
- PR 본문에는 `.github/pull_request_template.md`의 `Ticket:` 줄에 Notion ticket URL을 반드시 넣는다.
- same-repository PR에서 `Ticket:` URL이 없으면 `Notion Ticket Sync` GitHub Actions check가 실패하는 것이 정상이다.
- `Ticket:` URL의 Notion page는 `NOTION_TICKETS_DATA_SOURCE_ID`로 설정된 data source에 속해야 하며, 다른 data source의 page면 동기화하지 않는다.
- 자동화에 필요한 GitHub Actions 값은 `NOTION_TOKEN`, `NOTION_TICKETS_DATA_SOURCE_ID`, 기본 `GITHUB_TOKEN`이다. 실제 token 값과 data source ID 값은 코드, 문서, 커밋에 남기지 않는다.
- `NOTION_TOKEN`은 PR branch 또는 신뢰되지 않은 base branch에서 checkout한 코드에 주입하지 않는다. Notion 동기화는 `main` 대상 `pull_request_target` 이벤트와 trusted `workflow_run`에서만 실행하며, default branch 코드를 checkout한다. review signal과 CI-result sync도 PR base가 default branch가 아니면 Notion 갱신 전에 skip한다. trusted checkout에 sync script가 아직 없으면 skip한다.
- PR 이벤트는 Notion 업데이트 전 현재 PR 상태를 조회한다. 현재 PR이 이미 closed이면 오래된 이벤트로 보고 `IN-review`나 metadata를 다시 쓰지 않는다. 닫힘 이벤트도 현재 PR이 다시 열려 있으면 stale 이벤트로 보고 `Blocker`를 쓰지 않는다.
- PR branch push는 `pull_request synchronize` 이벤트를 통해 Notion의 `Last Push At`, `Last Head SHA`, `Last Push Summary`에 기록한다. 기록 전 현재 PR head SHA를 조회하고, webhook payload가 최신 head가 아니면 stale 이벤트로 보고 skip한다.
- PR 생성, 업데이트, branch push 이벤트는 기존 `CI Status`와 `Last CI Check`를 덮어쓰지 않는다. CI 상태 기록은 `workflow_run` 기반 `ci-result` sync가 담당한다. 같은 head SHA의 CI run이 여러 개 있으면 Actions run 목록에서 최신 run/attempt를 확인하고, 더 오래된 run은 stale 이벤트로 보고 skip한다.
- fork PR의 CI `workflow_run`은 `workflow_run.pull_requests`가 비어 있어도 `workflow_run.head_repository`가 현재 저장소와 다르면 Notion sync를 skip한다.
- PR 본문 수정은 `Ticket:` URL과 PR metadata만 확인하고 기존 CI/review 상태를 덮어쓰지 않는다.
- PR 생성, 업데이트, branch push 이벤트는 기존 `Review Status`와 `Last Review Check`를 덮어쓰지 않는다.
- PR review 제출은 토큰 없는 `.github/workflows/notion-ticket-review-dispatch.yml`의 read-only `pull_request_review` job이 signal만 남기고, secret-bearing `.github/workflows/notion-ticket-sync.yml`이 `workflow_run`으로 그 완료를 받아 trusted default branch 코드에서 현재 PR과 reviews API를 다시 조회한다. review signal workflow에는 `actions: write`를 주지 않는다. 승인 이벤트는 pagination까지 확인한 현재 review 목록에 활성 change request가 없을 때만 `Passed`로 기록하고, comment-only review는 이전 change request를 해제하지 않는다. 현재 decisive review가 dismissed-only이면 오래된 이벤트 fallback을 쓰지 않고 `Unknown`으로 기록한다.
- fork PR은 Notion token을 사용하는 동기화 대상에서 제외한다. GitHub API 응답에서 `head.repo`가 없거나 `null`인 PR도 출처를 신뢰할 수 없으므로 fork PR처럼 skip한다.

## 커밋 규칙

- 커밋 메시지는 한국어로 작성한다.
- 한 커밋에는 하나의 논리적 변경만 담는다.
- 커밋은 파일 개수가 아니라 변경 목적을 기준으로 나눈다.
- 커밋 전에는 변경 범위를 확인한다.
  - `git status --short --branch`
  - `git diff --stat`
  - `git diff --check`
- 관련 없는 파일은 stage하지 않는다.
- 일반 커밋 요청은 push 요청으로 간주하지 않는다. 사용자가 push를 명시적으로 요청하지 않으면 로컬 커밋만 만들고 원격에는 push하지 않는다.
- 단, PR 작업 단위로 확정된 Issue 작업 요청은 GitHub Issue/PR 작업 규칙에 따라 push와 PR 생성을 포함한다.
- `WIP`, `fix`, `update`처럼 의미가 모호한 커밋 메시지는 사용하지 않는다.

## 커밋 메시지 형식

권장 형식:

```text
<종류>: <한국어 요약>
```

예시:

```text
문서: AGENTS 커밋 규칙 추가
설정: Storybook 초기 구조 추가
기능: 분석 입력 글자 수 제한 추가
수정: 단어장 중복 저장 처리 오류 해결
리팩터: 공통 API 타입 정리
테스트: 분석 API 검증 케이스 추가
```

## 작업 완료 전 확인

- 문서만 수정한 경우에도 오타, placeholder, 모순이 없는지 확인한다.
- 코드 변경이 있으면 프로젝트에 맞는 lint, typecheck, test 중 가능한 검증을 실행한다.
- 실행하지 못한 검증이 있으면 이유를 사용자에게 알린다.
