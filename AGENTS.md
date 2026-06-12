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
- `#<번호> issue 작업해줘`처럼 특정 Issue 작업 요청을 받으면 해당 Issue 하나를 기준으로 branch 1개와 PR 1개를 만든다.
- 특정 Issue 작업 요청은 해당 branch를 원격에 push하고 PR을 생성해도 된다는 요청으로 간주한다.
- Issue 작업을 위해 branch를 만들 때는 AI가 생성하더라도 `<type>/<issue-number>-<short-slug>` 형식을 기본으로 한다.
- PR 본문에는 관련 Issue를 닫는 `Closes #<번호>` 문구를 포함한다.
- 사용자가 "바로 리뷰까지 진행해줘"라고 요청하면 PR을 ready 상태로 만들고 Codex automatic review를 기다린다.
- Codex review가 없거나 다시 확인이 필요하면 사용자가 `@codex review`를 수동으로 요청할 수 있다.
- 리뷰 수정은 사용자가 `PR #<번호> 리뷰 반영해줘`처럼 명시적으로 요청했을 때만 진행한다.
- AI는 PR 생성과 리뷰 반영까지 도울 수 있지만, 사용자의 명시적 요청 없이 merge하거나 `main`에 직접 push하지 않는다.
- Issue나 PR 요구사항이 모호하거나 현재 작업tree에 관련 없는 변경사항이 있으면 작업을 시작하기 전에 사용자에게 확인한다.

## 커밋 규칙

- 커밋 메시지는 한국어로 작성한다.
- 한 커밋에는 하나의 논리적 변경만 담는다.
- 커밋 전에는 변경 범위를 확인한다.
  - `git status --short --branch`
  - `git diff --stat`
  - `git diff --check`
- 관련 없는 파일은 stage하지 않는다.
- 일반 커밋 요청은 push 요청으로 간주하지 않는다. 사용자가 push를 명시적으로 요청하지 않으면 로컬 커밋만 만들고 원격에는 push하지 않는다.
- 단, 특정 Issue 작업 요청은 GitHub Issue/PR 작업 규칙에 따라 push와 PR 생성을 포함한다.
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
