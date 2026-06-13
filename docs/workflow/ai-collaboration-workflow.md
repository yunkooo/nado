# AI collaboration workflow

이 문서는 nado 프로젝트에서 AI에게 GitHub Issue, branch, PR 작업을 맡길 때의 요청 방식과 실행 경계를 정리한다.

핵심 원칙은 단순하다.

```text
AI는 작업을 도울 수 있지만, 작업을 확정하는 사람은 사용자다.
```

## 요청 유형

### 1. Issue 생성 요청

예시:

```text
분석 결과 화면 간격 개선 issue 만들어줘
로그인 실패 메시지 개선 issue 만들어줘
```

AI가 해야 할 일:

- 코드를 수정하지 않는다.
- 요구사항을 Issue 초안으로 정리한다.
- 일반 Issue로 충분한지, parent/sub-issue 구조가 필요한지 먼저 판단한다.
- 작업 내용, 이유, 완료 조건, 제외 범위를 쓴다.
- 큰 작업이면 parent issue와 sub-issue 후보를 제안한다.
- 요구사항이 모호하면 질문한다.
- GitHub Issue 생성 도구를 사용할 수 없으면 Issue 본문 초안을 제공하고 중단한다.

AI가 하지 않는 일:

- 사용자의 작업 시작 요청 없이 branch 생성
- Issue 생성 요청만으로 코드 수정
- 완료 조건이 없는 상태에서 구현 착수

Issue 생성 시 분해 판단 기준:

```text
일반 Issue로 충분한 경우:
- 한 PR로 리뷰하기 쉽다.
- 영향 영역이 하나다.
- 완료 조건이 5개 이하로 작다.
- 작업 순서 의존성이 없다.

parent/sub-issue 구조가 필요한 경우:
- 여러 앱/패키지에 걸쳐 있다.
- 여러 PR로 나누는 것이 자연스럽다.
- 단계 간 의존성이 있다.
- 완료 조건이 6개 이상이다.
- 리뷰 관점이 서로 다르다.
```

AI는 큰 작업을 parent issue로 만들 때 구현을 바로 시작하지 않는다. 사용자가 특정 sub-issue 작업을 요청하면 그 sub-issue를 기준으로 branch, commit, push, PR 생성을 진행한다.

### 2. Issue 작업 요청

예시:

```text
#12 issue 작업해줘
Issue #12 작업 시작해줘
#12 issue 작업하고 draft PR로 열어줘
```

AI가 해야 할 일:

```text
1. Issue 내용을 확인한다.
2. parent issue인지 실제 작업 issue인지 판단한다.
3. parent issue라면 sub-issue 선택 또는 분해를 먼저 요청한다.
4. 작업 범위와 완료 조건을 요약한다.
5. 현재 git 상태를 확인한다.
6. 필요한 경우 main 최신 상태를 확인한다.
7. Issue 번호가 포함된 branch를 만든다.
8. 작업을 구현한다.
9. 가능한 검증을 실행한다.
10. 관련 변경만 commit한다.
11. branch를 push한다.
12. 기본적으로 ready PR을 만들고 Issue를 연결한다.
13. 저장소 Codex automatic review가 켜져 있으면 Codex review가 시작되는지 확인한다.
14. Codex review가 시작되지 않았거나 다시 확인이 필요하면 PR 댓글로 `@codex review`를 요청한다.
15. 사용자가 명시적으로 draft를 요청한 경우에만 draft PR을 만들고, ready 전환 전에는 Codex review를 기대하지 않는다고 안내한다.
```

특정 Issue 작업 요청은 branch push와 PR 생성을 포함한다. 별도로 "push해줘"라고 말하지 않아도 PR 생성을 위해 원격 branch를 push할 수 있다.

특정 Issue 작업으로 새 PR을 만드는 경우 Codex review 트리거까지 기본 범위에 포함한다. 자동 리뷰는 저장소 Codex 설정에 의존하므로, 자동 리뷰가 바로 달리지 않으면 AI가 같은 PR에 `@codex review` 댓글을 남겨 수동으로 요청한다.

일반 커밋 요청은 다르게 처리한다. 사용자가 "커밋해줘"라고만 요청한 경우에는 로컬 commit까지만 진행하고, push는 사용자가 별도로 요청해야 한다.

AI가 만드는 branch도 사람이 만드는 branch와 같은 `<type>/<issue-number>-<short-slug>` 형식을 사용한다.

```text
fix/18-analysis-result-spacing
docs/21-github-workflow
```

`<type>`은 Issue 성격에 따라 `feat`, `fix`, `docs`, `chore`, `test`, `refactor` 중 하나를 고른다. 유형이 애매하면 branch를 만들기 전에 사용자에게 확인한다.

PR 본문에는 다음 문구를 포함한다.

```text
Closes #12
```

Sub-issue 작업 PR에는 parent issue도 함께 남긴다.

```text
Closes #8
Parent: #7
```

PR 생성 이후 AI가 하지 않는 일:

- Codex review가 달렸다는 이유만으로 자동 수정
- 사용자 요청 없는 리뷰 코멘트 반영
- 사용자 승인 없는 merge

AI가 멈춰야 하는 경우:

- Issue가 너무 넓거나 완료 조건이 없다.
- parent issue를 직접 작업하라는 요청이라 실제 구현 단위가 불명확하다.
- 현재 작업tree에 관련 없는 변경사항이 있다.
- main과 원격 branch가 충돌 위험이 있는 상태다.
- 필요한 secret, `.env`, 외부 권한이 없다.
- 검증 실패 원인을 아직 파악하지 못했다.

### 3. PR 수정 요청

예시:

```text
PR #13 리뷰 반영해줘
PR #13 수정해줘
```

AI가 해야 할 일:

- PR과 리뷰 내용을 확인한다.
- 같은 branch에서 수정한다.
- 리뷰 내용이 타당한지 코드 기준으로 확인한다.
- 수정 후 가능한 검증을 실행한다.
- 추가 commit 후 push한다.
- 무엇을 반영했는지 요약한다.

AI가 하지 않는 일:

- 사용자 승인 없는 merge
- 사용자 승인 없는 main 직접 push
- 사용자 요청 없는 Codex review 자동 수정
- 리뷰와 무관한 리팩터링
- 실패한 검증을 통과한 것처럼 보고

## AI 작업 전 체크리스트

AI는 Issue 또는 PR 작업을 시작하기 전에 아래를 확인한다.

```bash
git status --short --branch
```

코드 변경을 commit하기 전에는 루트 `AGENTS.md`의 커밋 전 확인 명령을 따른다.

```bash
git status --short --branch
git diff --stat
git diff --check
```

관련 파일만 stage하고, stage 후에는 가능한 경우 staged diff도 확인한다.

```bash
git diff --cached --check
```

## 사용자 확인 지점

사용자가 결정해야 하는 지점:

- Issue를 실제 작업으로 시작할지
- 애매한 요구사항을 어떻게 해석할지
- PR을 merge할지
- 검증 실패나 외부 환경 문제를 어떻게 처리할지
- 작업 범위를 넓힐지 별도 Issue로 분리할지

## 보고 형식

AI는 작업을 마친 뒤 다음 내용을 짧게 보고한다.

```text
작업한 Issue/PR
변경한 파일
실행한 검증
실행하지 못한 검증과 이유
남은 리뷰 포인트
```

작업이 중단된 경우에는 중단 이유와 다음 선택지를 함께 제시한다.
