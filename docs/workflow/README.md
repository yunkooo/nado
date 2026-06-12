# GitHub workflow documents

이 디렉터리는 nado 프로젝트에서 GitHub Issue, branch, PR, AI 협업 흐름을 같은 기준으로 운영하기 위한 문서 모음이다.

목표는 복잡한 자동화보다 단순하고 반복 가능한 작업 흐름을 먼저 만드는 것이다.

```text
Issue 1개 = Branch 1개 = PR 1개
```

## 문서 읽는 순서

| 문서 | 언제 읽나 |
| --- | --- |
| [github-workflow.md](github-workflow.md) | 전체 작업 흐름을 확인할 때 |
| [issue-workflow.md](issue-workflow.md) | 기능 요청, 버그, 개선 작업을 Issue로 정리할 때 |
| [pr-workflow.md](pr-workflow.md) | 작업 결과를 PR로 올리거나 리뷰를 반영할 때 |
| [ai-collaboration-workflow.md](ai-collaboration-workflow.md) | AI에게 Issue 생성, Issue 작업, PR 수정을 맡길 때 |

실제 GitHub 템플릿 파일:

| 템플릿 | 위치 |
| --- | --- |
| Issue template | [../../.github/ISSUE_TEMPLATE/task.yml](../../.github/ISSUE_TEMPLATE/task.yml) |
| PR template | [../../.github/pull_request_template.md](../../.github/pull_request_template.md) |

## 핵심 원칙

- Issue는 작업의 이유, 범위, 완료 조건을 기록한다.
- Branch는 하나의 Issue를 해결하기 위해 만든다.
- PR은 변경 내용, 검증 결과, 리뷰 포인트를 공유한다.
- 특정 Issue 작업 요청은 branch push와 PR 생성을 포함한다.
- AI는 Issue와 PR 작업을 도울 수 있지만 merge는 사용자가 결정한다.
- 애매한 요구사항은 구현으로 넘기지 않고 Issue 또는 질문으로 먼저 정리한다.

## 기본 흐름

```text
1. 사용자가 기능/버그/개선 요청을 말한다.
2. 필요한 경우 Issue를 만든다.
3. 사용자가 특정 Issue 작업을 요청한다.
4. 해당 Issue 전용 branch에서 작업한다.
5. 검증 후 commit, push, PR을 만든다.
6. 사용자가 PR을 리뷰한다.
7. 수정 요청이 있으면 같은 PR branch에 반영한다.
8. 사용자가 merge한다.
```

## 예시 요청

```text
분석 결과 화면 간격 개선 issue 만들어줘
#12 issue 작업해줘
PR #13 리뷰 반영해줘
```

위 요청을 처리할 때는 루트 [AGENTS.md](../../AGENTS.md)의 규칙과 이 디렉터리의 문서를 함께 따른다.

Issue 작업을 위해 branch를 만들 때는 AI가 생성하더라도 `<type>/<issue-number>-<short-slug>` 형식을 기본으로 한다.
