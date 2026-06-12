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
- 작업 내용, 이유, 완료 조건, 제외 범위를 쓴다.
- 요구사항이 모호하면 질문한다.
- GitHub Issue 생성 도구를 사용할 수 없으면 Issue 본문 초안을 제공하고 중단한다.

AI가 하지 않는 일:

- 사용자의 작업 시작 요청 없이 branch 생성
- Issue 생성 요청만으로 코드 수정
- 완료 조건이 없는 상태에서 구현 착수

### 2. Issue 작업 요청

예시:

```text
#12 issue 작업해줘
Issue #12 작업 시작해줘
```

AI가 해야 할 일:

```text
1. Issue 내용을 확인한다.
2. 작업 범위와 완료 조건을 요약한다.
3. 현재 git 상태를 확인한다.
4. 필요한 경우 main 최신 상태를 확인한다.
5. Issue 번호가 포함된 branch를 만든다.
6. 작업을 구현한다.
7. 가능한 검증을 실행한다.
8. 관련 변경만 commit한다.
9. branch를 push한다.
10. draft PR을 만들고 Issue를 연결한다.
```

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

AI가 멈춰야 하는 경우:

- Issue가 너무 넓거나 완료 조건이 없다.
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
