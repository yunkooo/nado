# Issue workflow

Issue는 작업을 시작하기 전에 문제, 범위, 완료 조건을 정리하는 문서다. 좋은 Issue는 코드를 바로 고치라는 지시가 아니라, 무엇을 왜 바꾸고 어디까지 하면 끝인지 알려준다.

## Issue를 만드는 경우

다음 작업은 Issue로 먼저 정리한다.

- 사용자 기능 추가
- UI/UX 개선
- 버그 수정
- 문서 구조 변경
- 반복될 가능성이 있는 설정/자동화 작업
- 여러 파일이나 앱에 영향을 주는 변경

아주 작은 오타 수정처럼 맥락이 필요 없는 작업은 사용자가 직접 요청하면 Issue 없이 처리할 수 있다. 단, 작업 범위가 커질 것 같으면 Issue로 분리한다.

## Issue 크기 판단

기본값은 일반 Issue 하나다. 일반 Issue는 branch 1개와 PR 1개로 끝낼 수 있는 작업에 사용한다.

다만 하나의 요청이 크다면 먼저 PR 단위를 판단한다. PR 단위는 issue 구조가 아니라 리뷰 가능, 검증 가능, 독립 merge 가능 여부로 정한다.

```text
작은 작업 = Issue 1개 -> Branch 1개 -> PR 1개
큰 cohesive 작업 = Parent issue 1개 -> Branch 1개 -> PR 1개
독립 작업 묶음 = Parent issue 1개 -> Sub-issue 여러 개
독립 실제 작업 = Sub-issue 1개 -> Branch 1개 -> PR 1개
```

Parent issue는 큰 작업의 배경, 목표, 전체 완료 조건을 추적하는 용도로 사용한다. 큰 작업이 하나의 cohesive change라면 parent issue 기준으로 branch와 PR을 만들고, sub-issue나 checklist는 세부 추적용으로 사용한다. 여러 독립 변경으로 나뉘는 작업이라면 sub-issue 기준으로 branch와 PR을 만든다.

## Parent/sub-issue 판단 기준

아래 조건 중 하나 이상에 해당하면 parent issue 기준 PR 1개로 진행하는 것을 검토한다.

- 여러 파일을 수정하지만 하나의 정책, 기능 흐름, UX 흐름으로 같이 리뷰해야 한다.
- 일부만 merge되면 문서나 코드가 서로 다른 기준을 말할 수 있다.
- 검증이 하나의 PR에서 함께 이루어져야 의미가 있다.
- 리뷰어가 같은 맥락에서 한 번에 보는 편이 이해하기 쉽다.

아래 조건 중 하나 이상에 해당하면 parent issue를 추적용으로 만들고 독립 sub-issue 기준 PR로 나누는 것을 검토한다.

- 각 sub-issue가 독립적으로 리뷰, 검증, merge될 수 있다.
- 한 sub-issue가 늦어져도 다른 sub-issue를 먼저 merge해도 된다.
- 앱, 패키지, 리뷰 관점이 뚜렷하게 다르다.
- 각 sub-issue가 별도 배포 가치나 rollback 가치를 가진다.

반대로 단일 파일 수정, 작은 버그 수정, Story 하나 추가, 문서 한두 개 정리처럼 한 번에 구현/검증/리뷰할 수 있는 작업은 일반 Issue 하나로 유지한다.

### Parent issue 기준 PR 1개 예시

```md
## 작업 내용

GitHub workflow 문서의 review fallback과 parent/sub-issue PR 기준을 재정리한다.

## 이유

`AGENTS.md`와 `docs/workflow/`가 같은 정책을 설명하므로, 일부 문서만 먼저 merge되면 문서끼리 충돌할 수 있다.

## 세부 항목

- [ ] `AGENTS.md`의 고정 review 확인 규칙 제거
- [ ] `docs/workflow/README.md`의 parent/sub-issue 기준 수정
- [ ] `pr-workflow.md`의 PR 연결 예시 수정
- [ ] `issue-workflow.md`의 분해 기준 수정
```

### 독립 sub-issue 분리 예시

```md
## 작업 내용

Storybook과 디자인 시스템 패키지 운영 구조를 정리한다.

## 이유

토큰, Web/Desktop 공통 UI, Mobile 스타일, Storybook 검증 규칙이 서로 연결되어 있어 하나의 PR로 리뷰하기 어렵다.

## Sub-issue 후보

- [ ] `@nado/tokens` 패키지 분리
- [ ] Mobile 스타일 공통 토큰 연결
- [ ] UI 패키지에 Storybook story 배치
- [ ] Web/Desktop surface story 추가
- [ ] Storybook 검증 규칙 문서화
```

## 좋은 Issue의 기준

좋은 Issue는 아래 질문에 답한다.

```text
왜 필요한가?
무엇을 바꾸는가?
어디까지 하면 완료인가?
이번 작업에서 하지 않을 것은 무엇인가?
확인은 어떻게 할 것인가?
```

## 기본 구성

실제 GitHub Issue template은 [../../.github/ISSUE_TEMPLATE/task.yml](../../.github/ISSUE_TEMPLATE/task.yml)에 둔다.

```md
## 작업 내용

무엇을 바꾸나요?

## 이유

왜 필요한가요?

## 완료 조건

- [ ] 조건 1
- [ ] 조건 2
- [ ] 테스트 또는 확인 완료

## 제외 범위

이번 작업에서 하지 않을 것

## 참고

관련 화면, 파일, 문서, 에러 메시지
```

## Issue 템플릿 작성 예시

Issue는 "해야 할 일"만 적지 않고 "왜 필요한지"와 "어디까지 하면 끝인지"를 함께 적는다.

### 기능/개선 Issue 예시

```md
## 작업 내용

분석 결과 화면에서 입력창과 결과 카드 사이의 간격을 개선한다.

## 이유

현재 narrow 화면에서 입력 영역과 결과 카드가 붙어 보여서 사용자가 분석 결과의 시작 지점을 빠르게 구분하기 어렵다.
분석 완료 후 시선이 자연스럽게 결과 카드로 이동하도록 화면 간격을 정리할 필요가 있다.

## 완료 조건

- [ ] 웹 분석 화면에서 입력창과 결과 카드 사이에 일관된 간격이 적용된다.
- [ ] Storybook의 narrow 상태에서도 결과 카드가 입력창과 시각적으로 겹치지 않는다.
- [ ] 기존 분석 요청, 로딩, 에러 상태의 동작은 변경하지 않는다.
- [ ] 관련 Storybook 또는 화면 확인을 완료한다.

## 제외 범위

- 분석 결과 카드 내부 정보 구조 변경
- 분석 API 응답 schema 변경
- 전체 분석 화면 레이아웃 개편

## 참고

- 관련 화면: 웹 분석 화면
- 관련 Storybook: `analysis-analysisresult--narrow`
```

### 버그 Issue 예시

```md
## 작업 내용

단어장 저장 요청이 중복 단어를 만났을 때 실패하지 않고 기존 항목에 의미와 설명을 병합하도록 수정한다.

## 이유

사용자가 같은 단어를 다른 문맥에서 다시 저장할 수 있다.
이 경우 저장 실패로 끝나면 학습 흐름이 끊기므로, 기존 단어장 항목을 유지하면서 새 정보를 합치는 동작이 필요하다.

## 완료 조건

- [ ] 같은 사용자가 같은 단어를 다시 저장해도 API가 실패하지 않는다.
- [ ] 기존 단어의 의미 또는 설명과 새 요청의 내용이 병합된다.
- [ ] 다른 사용자의 단어장 항목에는 영향을 주지 않는다.
- [ ] 관련 API 테스트 또는 smoke 확인을 완료한다.

## 제외 범위

- 단어장 UI 디자인 변경
- 단어 정규화 정책 변경
- 복습 카드 알고리즘 변경

## 참고

- 관련 API: `POST /api/vocabulary`
- 보안 기준: 사용자별 RLS 정책을 유지해야 한다.
```

### 문서 Issue 예시

```md
## 작업 내용

GitHub Issue, branch, PR 기반 작업 흐름을 문서화한다.

## 이유

기능 요청을 바로 구현하기보다 Issue로 정리하고, 특정 Issue 작업 요청이 있을 때 branch와 PR을 만드는 흐름을 프로젝트 규칙으로 남길 필요가 있다.
AI와 사람이 같은 기준으로 작업하려면 Issue 작성법, branch 이름, PR 작성법이 문서에 분리되어 있어야 한다.

## 완료 조건

- [ ] GitHub 전체 workflow 문서가 추가된다.
- [ ] Issue 작성 기준과 예시가 추가된다.
- [ ] PR 작성 기준과 예시가 추가된다.
- [ ] `AGENTS.md`에서 workflow 문서를 확인하도록 연결한다.

## 제외 범위

- GitHub Issue template 파일 생성
- PR template 파일 생성
- 자동화 script 구현

## 참고

- 문서 위치: `docs/workflow/`
```

## AI가 Issue를 만들 때

사용자가 아래처럼 요청하면 AI는 코드를 수정하지 않고 Issue 초안을 먼저 만든다.

```text
분석 결과 화면 간격 개선 issue 만들어줘
로그인 실패 메시지 개선 issue 만들어줘
```

AI는 Issue 초안에 다음 내용을 포함한다.

- 작업 배경
- 변경 범위
- 완료 조건
- 제외 범위
- 검증 방법
- 일반 Issue로 충분한지 또는 parent/sub-issue 분리가 필요한지에 대한 판단

요구사항이 모호하면 Issue를 만들기 전에 질문한다. 질문 없이 구현으로 넘어가지 않는다.

## 좋은 예시

```md
## 작업 내용

분석 결과 화면에서 입력창과 결과 카드 사이의 간격을 조정한다.

## 이유

현재 좁은 화면에서 결과 카드가 입력창에 붙어 보여서 분석 결과의 시작 지점을 구분하기 어렵다.

## 완료 조건

- [ ] 웹 분석 화면에서 입력창과 결과 카드 사이에 안정적인 간격이 있다.
- [ ] Storybook narrow 상태에서도 결과 카드가 겹치지 않는다.
- [ ] 기존 분석 API 동작은 변경하지 않는다.

## 제외 범위

- 분석 결과 카드 내부 디자인 개편
- API 응답 구조 변경
```

## 나쁜 예시

```md
분석 화면 고쳐줘
```

이 Issue는 문제, 범위, 완료 조건이 없어서 바로 작업하기 어렵다. 이 경우 먼저 어떤 화면, 어떤 문제, 어떤 완료 기준인지 확인한다.

## Label 기준

처음에는 label을 많이 만들지 않는다.

권장 label:

```text
type:feat
type:fix
type:docs
type:chore
type:test
type:refactor
status:todo
status:in-progress
status:review
status:done
```

필요해질 때만 `area:web`, `area:api`, `area:storybook` 같은 영역 label을 추가한다.
