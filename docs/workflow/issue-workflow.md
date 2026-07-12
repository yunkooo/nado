# Issue 작성

Issue는 구현 지시서가 아니라 문제와 완료 기준을 공유하는 문서다.

## Issue가 필요한 경우

- 사용자 기능이나 화면을 추가한다.
- 버그 또는 잘못된 상태를 수정한다.
- 여러 파일·앱에 영향을 주는 리팩터링을 한다.
- 반복될 설정, 자동화, 문서 구조를 바꾼다.
- 작업 범위와 제외 범위를 리뷰 전에 합의해야 한다.

맥락이 필요 없는 작은 오타처럼 사용자가 직접 요청한 변경은 Issue 없이 처리할 수 있다. 작업이 커지면 먼저 Issue로 분리한다.

## 작업 크기 분류

먼저 용어를 구분한다.

| 용어               | 뜻                                            |
| ------------------ | --------------------------------------------- |
| cohesive parent    | 한 PR에서 함께 검토할 묶음 작업               |
| tracking parent    | 여러 독립 작업의 진행을 추적하는 상위 Issue   |
| native sub-issue   | GitHub 기능으로 상위 Issue에 연결한 하위 작업 |
| same-repository PR | fork가 아니라 이 저장소 branch에서 만든 PR    |

| 질문                                                | 판단                               |
| --------------------------------------------------- | ---------------------------------- |
| 하나의 변경으로 리뷰·검증·rollback해야 하는가?      | 일반 Issue 또는 cohesive parent    |
| 일부가 늦어져도 다른 부분을 먼저 merge할 수 있는가? | tracking parent + native sub-issue |
| 여러 앱을 건드리지만 하나의 정책만 바꾸는가?        | cohesive parent 가능               |
| 각 앱 변경이 독립 가치와 검증을 가지는가?           | 앱별 sub-issue                     |

tracking parent에는 직접 branch나 PR을 만들지 않는다. 먼저 실제 GitHub native sub-issue를 만들고 연결한다. Checklist는 sub-issue 후보를 정리하는 보조 메모로만 사용한다.

## Issue form 항목

[실제 Issue form](../../.github/ISSUE_TEMPLATE/task.yml)은 아래 내용을 요구한다.

| 항목      | 작성 기준                                          |
| --------- | -------------------------------------------------- |
| 작업 유형 | `feat`, `fix`, `docs`, `chore`, `test`, `refactor` |
| 영향 영역 | 가장 크게 영향받는 앱·패키지·문서                  |
| 작업 분해 | 단일, cohesive parent, tracking parent, 판단 필요  |
| 작업 내용 | 무엇을 바꾸는가                                    |
| 이유      | 어떤 문제를 해결하는가                             |
| 완료 조건 | 검증 가능한 checklist                              |
| 제외 범위 | 이번 작업에서 하지 않을 것                         |
| 확인 방법 | 명령, 화면, smoke 절차                             |

## 좋은 완료 조건

완료 조건은 구현 방법보다 확인 가능한 결과로 쓴다.

```markdown
## 작업 내용

계정 전환 후 이전 사용자의 분석 결과가 보이지 않도록 한다.

## 이유

공유 기기에서 사용자 데이터가 섞일 가능성이 있다.

## 완료 조건

- [ ] 저장 상태가 사용자 ID와 연결된다.
- [ ] 다른 사용자 상태는 복원하지 않는다.
- [ ] 계정 전환 중 끝난 이전 요청 결과를 버린다.
- [ ] Web, Mobile, Desktop 회귀 테스트가 통과한다.

## 제외 범위

- 분석 히스토리 서버 저장
- 계정 관리 화면 개편
```

## Parent와 sub-issue

- cohesive parent PR은 `Closes #<parent>`를 사용하고 세부 항목은 checklist 또는 `Refs`로 남긴다.
- 독립 sub-issue PR은 `Closes #<sub-issue>`와 `Parent: #<parent>`를 사용한다.
- `Parent:` 문구는 GitHub native sub-issue 연결을 대신하지 않는다.

## Branch를 만들기 전

1. 연결할 GitHub Issue를 선택한다. Issue가 없으면 branch를 만들지 말고 사용자에게 Issue 생성 또는 선택을 요청한다.
2. Issue가 일반 Issue, cohesive parent, tracking parent, 독립 sub-issue 중 무엇인지 확정한다.
3. tracking parent라면 branch를 만들지 않고 실제 작업할 native sub-issue를 먼저 선택하거나 생성·연결한다.
4. 저장소의 default branch를 확인한다. 작업 branch는 default branch를 기준으로 만들고 PR base도 default branch로 지정한다. 다른 base가 필요하면 branch 생성 전에 사용자에게 확인한다.
5. 현재 작업tree의 관련 없는 변경이 새 branch에 섞이지 않는지 확인한다.

Issue 작업 branch는 `<type>/<issue-number>-<short-slug>` 형식을 사용한다. cohesive parent는 parent 번호를, 독립 sub-issue는 sub-issue 번호를 사용한다.

## AI에게 요청할 때

```text
이 작업으로 Issue 만들어줘
#42 issue 작업해줘
```

첫 요청은 Issue 내용만 작성한다. 두 번째 요청은 Issue 유형이 실제 PR 작업 단위이고 default branch가 PR base인지 확인한 뒤 branch, 구현, 검증, push, PR까지 진행한다.
