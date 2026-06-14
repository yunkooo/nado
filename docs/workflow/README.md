# GitHub workflow documents

이 디렉터리는 nado 프로젝트에서 GitHub Issue, branch, PR, AI 협업 흐름을 같은 기준으로 운영하기 위한 문서 모음이다.

목표는 복잡한 자동화보다 단순하고 반복 가능한 작업 흐름을 먼저 만드는 것이다.

```text
기본 작업: Issue 1개 = Branch 1개 = PR 1개
큰 cohesive 작업: Parent issue 1개 = Branch 1개 = PR 1개
독립 작업 묶음: Parent issue 1개 = 추적용, GitHub native Sub-issue 1개 = Branch 1개 = PR 1개
Commit 1개 = 단일 목적 1개
```

## 문서 읽는 순서

| 문서                                                         | 언제 읽나                                        |
| ------------------------------------------------------------ | ------------------------------------------------ |
| [github-workflow.md](github-workflow.md)                     | 전체 작업 흐름을 확인할 때                       |
| [issue-workflow.md](issue-workflow.md)                       | 기능 요청, 버그, 개선 작업을 Issue로 정리할 때   |
| [pr-workflow.md](pr-workflow.md)                             | 작업 결과를 PR로 올리거나 리뷰를 반영할 때       |
| [ai-collaboration-workflow.md](ai-collaboration-workflow.md) | AI에게 Issue 생성, Issue 작업, PR 수정을 맡길 때 |

실제 GitHub 템플릿 파일:

| 템플릿         | 위치                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| Issue template | [../../.github/ISSUE_TEMPLATE/task.yml](../../.github/ISSUE_TEMPLATE/task.yml)   |
| PR template    | [../../.github/pull_request_template.md](../../.github/pull_request_template.md) |

## 핵심 원칙

- Issue는 작업의 이유, 범위, 완료 조건을 기록한다.
- Branch는 하나의 PR 작업 단위를 해결하기 위해 만든다.
- Commit은 하나의 변경 목적을 기록한다.
- PR은 변경 내용, 검증 결과, 리뷰 포인트를 공유한다.
- PR 단위는 issue 구조가 아니라 리뷰 가능, 검증 가능, 독립 merge 가능 여부로 정한다.
- 큰 cohesive 작업은 parent issue 기준 branch 1개와 PR 1개로 처리하고, sub-issue나 checklist는 세부 추적용으로 사용할 수 있다.
- 여러 독립 작업으로 나뉘는 큰 작업은 parent issue를 추적용으로 만들고, GitHub native sub-issue 기준으로 branch와 PR을 만든다.
- tracking parent issue의 진행률은 GitHub native sub-issue 연결을 우선 기준으로 보고, Markdown checklist는 후보 정리나 보조 메모로만 사용한다.
- GitHub native sub-issue 연결을 사용할 수 없으면 Markdown checklist와 `Parent: #<parent>` 표기를 fallback으로 사용하고, 수동 최신화가 필요하다는 점을 남긴다.
- PR 작업 단위로 확정된 Issue 작업 요청은 branch push와 ready PR 생성을 포함한다.
- 새 PR은 기본적으로 ready 상태로 만들고, 저장소 Codex automatic review 대상이 되도록 한다.
- `yunkooo/nado`의 Codex code review 설정은 개인 기본 설정 상속을 피하고, 저장소 row에서 `자동 코드 검토`를 명시적으로 켠 뒤 `Review trigger`를 `매 푸시마다`로 둔다.
- AI는 설정 UI를 직접 확인하거나 변경할 수 없으므로, 설정 상태가 불명확하면 사용자에게 확인한다.
- 자동 리뷰 결과는 최신 PR head commit 기준으로 확인한다.
- AI는 Codex review 생성을 고정 시간 동안 지켜보지 않는다.
- 사용자가 필요할 때 PR 화면에서 Codex review 여부를 확인하고, 결과가 없거나 재검토가 필요하면 PR 댓글로 `@codex review`를 직접 요청한다.
- AI는 Issue와 PR 작업을 도울 수 있지만 merge는 사용자가 결정한다.
- 애매한 요구사항은 구현으로 넘기지 않고 Issue 또는 질문으로 먼저 정리한다.

## 기본 흐름

```text
1. 사용자가 기능/버그/개선 요청을 말한다.
2. 작업 크기를 판단한다.
3. 작은 작업은 일반 Issue로 만들고, 큰 작업은 parent issue와 native sub-issue 후보를 만든다.
4. PR 단위가 일반 Issue, cohesive parent issue, 독립 sub-issue인지 판단한다.
5. tracking parent issue라면 GitHub native sub-issue를 생성/연결하고, 작업할 sub-issue를 먼저 정한다.
6. 해당 PR 작업 단위의 Issue 번호로 branch를 만든다.
7. 검증 후 commit, push, ready PR을 만든다.
8. PR 본문에 닫을 Issue와 세부 추적 항목을 연결한다.
9. 사용자가 필요할 때 PR과 Codex review를 확인한다.
10. Codex review가 없거나 재검토가 필요하면 사용자가 `@codex review`를 직접 요청한다.
11. 수정 요청이 있으면 같은 PR branch에 반영한다.
12. 사용자가 merge한다.
```

## 예시 요청

```text
분석 결과 화면 간격 개선 issue 만들어줘
#12 issue 작업해줘
PR #13 리뷰 반영해줘
```

위 요청을 처리할 때는 루트 [AGENTS.md](../../AGENTS.md)의 규칙과 이 디렉터리의 문서를 함께 따른다.

Issue 작업을 위해 branch를 만들 때는 AI가 생성하더라도 `<type>/<issue-number>-<short-slug>` 형식을 기본으로 한다.
큰 cohesive 작업은 parent issue 번호를 기준으로 branch와 PR을 만들고, 세부 항목은 PR 본문 checklist나 `Refs #<sub-issue>`로 연결한다.
독립적으로 리뷰/검증/merge 가능한 sub-issue 작업은 GitHub native sub-issue 번호를 기준으로 branch와 PR을 만들고 `Parent: #<parent>`를 함께 남긴다.
