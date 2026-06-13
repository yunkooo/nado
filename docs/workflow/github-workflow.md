# GitHub workflow

nado의 GitHub 작업 흐름은 작은 단위의 Issue, branch, PR을 기준으로 한다. 목적은 작업 맥락을 남기고, AI가 코드를 수정하더라도 사용자가 최종 merge 지점을 통제할 수 있게 하는 것이다.

## 전체 흐름

```text
요청 정리
-> 작업 크기 판단
-> 일반 Issue 또는 parent/sub-issue 생성
-> 실제 작업 Issue 번호 기준 branch 생성
-> 코드/문서 작업
-> 검증
-> commit
-> push
-> PR 생성
-> Codex review
-> 사용자 review
-> merge
```

## Issue 작업 요청의 범위

사용자가 특정 Issue 작업을 요청하면 해당 요청은 branch push, PR 생성, Codex review 트리거를 포함한다.

```text
#12 issue 작업해줘
```

위 요청에는 다음 작업이 포함된다.

- Issue 확인
- branch 생성
- 코드/문서 수정
- 검증
- commit
- push
- ready PR 생성
- Codex automatic review 대기

일반 커밋 요청은 push 요청으로 간주하지 않는다.

```text
현재 변경사항 커밋해줘
```

위 요청은 로컬 commit까지만 포함한다. push는 사용자가 별도로 요청해야 한다.

Issue 작업 요청에도 merge나 `main` 직접 push는 포함되지 않는다.

새 PR은 기본적으로 ready 상태로 만든다. 저장소 Codex automatic review가 켜져 있으면 새 PR이 review 대상으로 열리거나 push가 들어올 때 자동 리뷰 결과를 기다린다.

AI는 기본 PR 생성 흐름에서 `@codex review` 댓글을 대신 남기지 않는다. 자동 리뷰 결과가 없거나 다시 확인이 필요할 때만 사용자가 PR 댓글로 수동 리뷰를 직접 요청한다.

```text
@codex review
```

Draft PR은 사용자가 명시적으로 draft를 요청했을 때만 만들고, ready 전환 전에는 Codex review를 기대하지 않는다.

## Parent/Sub-issue 기준

기본 작업은 일반 Issue 하나로 관리한다. 큰 작업은 parent issue를 추적용으로 만들고, 실제 구현 단위는 sub-issue로 분리한다.

| 구분         | 역할                              | Branch/PR                                     |
| ------------ | --------------------------------- | --------------------------------------------- |
| 일반 Issue   | 작은 작업의 추적과 구현 단위      | Issue 번호 기준으로 branch와 PR을 만든다.     |
| Parent issue | 큰 작업의 배경, 목표, 진행률 추적 | 직접 branch와 PR을 만들지 않는다.             |
| Sub-issue    | 큰 작업 안의 실제 구현 단위       | Sub-issue 번호 기준으로 branch와 PR을 만든다. |

예시:

```text
Parent issue: #7 Storybook과 디자인 시스템 패키지 운영 구조 정리
Sub-issue: #8 @nado/tokens 패키지 분리
Branch: chore/8-tokens-package
PR: Closes #8, Parent: #7
```

Parent issue를 닫는 PR을 직접 만들지 않는다. 모든 sub-issue가 merge된 뒤 사용자가 parent issue를 닫거나, 마지막 정리 PR에서 parent issue 상태를 갱신한다.

## 상태 기준

처음에는 GitHub label만으로 상태를 관리해도 충분하다.

| 상태                 | 의미                             |
| -------------------- | -------------------------------- |
| `status:todo`        | 작업할 Issue가 만들어진 상태     |
| `status:in-progress` | Issue 작업을 시작한 상태         |
| `status:review`      | PR이 올라가 리뷰를 기다리는 상태 |
| `status:done`        | PR이 merge되어 Issue가 닫힌 상태 |

`status:done`은 사용자가 PR을 merge한 뒤의 상태로 본다. AI는 직접 merge하거나 완료 상태를 확정하지 않는다.

## Branch 규칙

Branch는 Issue 하나에 하나씩 만든다.

Issue 작업을 위해 branch를 만들 때는 아래 형식을 기본으로 한다. AI가 생성하는 branch도 같은 규칙을 따른다.

```text
<type>/<issue-number>-<short-slug>
```

예시:

```text
feat/12-login-error-message
fix/18-analysis-result-spacing
docs/21-github-workflow
chore/24-ci-config
test/31-analysis-api-cases
refactor/42-vocabulary-service-boundary
```

권장 prefix:

| prefix     | 용도                     |
| ---------- | ------------------------ |
| `feat`     | 사용자 기능 추가         |
| `fix`      | 버그 수정                |
| `docs`     | 문서 변경                |
| `chore`    | 설정, 도구, 관리 작업    |
| `test`     | 테스트 추가 또는 보강    |
| `refactor` | 동작 변경 없는 구조 개선 |

## Branch 이름 작성 규칙

Branch 이름은 다음 기준으로 만든다.

```text
<type>/<issue-number>-<short-slug>
```

| 구성             | 규칙                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `<type>`         | Issue 성격에 맞는 `feat`, `fix`, `docs`, `chore`, `test`, `refactor` 중 하나를 사용한다. |
| `<issue-number>` | GitHub Issue 번호를 숫자로 넣는다.                                                       |
| `<short-slug>`   | 작업 내용을 2-5개의 짧은 영어 단어로 요약한다.                                           |

Slug 규칙:

- 영어 소문자, 숫자, hyphen만 사용한다.
- 공백은 hyphen으로 바꾼다.
- 관사, 조사, 불필요한 수식어는 뺀다.
- 너무 길면 핵심 명사와 동사만 남긴다.
- 한글 제목은 의미를 보존해서 짧은 영어로 바꾼다.

예시:

| Issue 제목                         | Branch 이름                      |
| ---------------------------------- | -------------------------------- |
| `#12 로그인 실패 메시지 개선`      | `feat/12-login-error-message`    |
| `#18 분석 결과와 입력창 간격 수정` | `fix/18-analysis-result-spacing` |
| `#21 GitHub 작업 흐름 문서화`      | `docs/21-github-workflow`        |
| `#31 분석 API 검증 케이스 추가`    | `test/31-analysis-api-cases`     |

Issue 유형이 애매하면 branch를 만들기 전에 유형을 먼저 정한다.

Parent issue 아래의 sub-issue를 작업할 때도 branch 이름은 parent issue 번호가 아니라 sub-issue 번호를 사용한다.

## 작업 시작 체크

Issue 작업을 시작하기 전에는 현재 작업tree와 branch 상태를 확인한다.

```bash
git status --short --branch
```

다음 상황에서는 바로 작업하지 않고 사용자에게 확인한다.

- 현재 branch에 관련 없는 변경사항이 있다.
- `main`이 원격과 크게 diverge되어 단순 pull이 위험하다.
- Issue 내용만으로 완료 조건을 판단하기 어렵다.
- 하나의 Issue에 서로 독립적인 작업이 여러 개 섞여 있다.
- parent issue를 직접 구현하라는 요청처럼 실제 작업 단위가 불명확하다.
- 민감 정보나 `.env` 값이 변경 범위에 포함될 가능성이 있다.

## Commit 규칙

Commit은 루트 `AGENTS.md`의 커밋 규칙을 따른다.

- 커밋 메시지는 한국어로 작성한다.
- 한 커밋에는 하나의 논리적 변경만 담는다.
- 커밋 전 변경 범위를 확인한다.

권장 형식:

```text
<종류>: <한국어 요약>
```

예시:

```text
문서: GitHub 작업 흐름 정리
수정: 분석 결과 간격 조정
기능: 단어장 페이지네이션 추가
```

## PR 연결

PR 본문에는 관련 Issue를 닫는 문구를 포함한다.

```text
Closes #12
```

Sub-issue 작업 PR은 sub-issue를 닫고 parent issue를 별도 줄에 남긴다.

```text
Closes #8
Parent: #7
```

PR이 merge되면 GitHub가 Issue를 자동으로 닫는다. merge 전에는 Issue를 수동으로 `done` 처리하지 않는다.

## Merge 기준

Merge는 사용자가 결정한다.

AI는 다음 작업까지 수행할 수 있다.

- Issue 확인
- branch 생성
- 코드/문서 수정
- 검증
- commit
- push
- PR 생성
- Codex automatic review 결과 확인
- 리뷰 반영

AI는 다음 작업을 하지 않는다.

- 사용자 승인 없는 merge
- 사용자 승인 없는 main 직접 push
- 관련 없는 Issue를 함께 처리
- 검증 실패를 숨긴 상태의 완료 보고
