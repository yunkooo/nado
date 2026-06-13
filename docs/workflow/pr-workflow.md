# PR workflow

PR은 변경 내용을 공유하고 merge 전에 검토하는 공간이다. nado에서는 PR을 Issue와 연결하고, 검증 결과와 남은 위험을 명확히 적는 것을 기본으로 한다.

## PR을 만드는 시점

다음 조건을 만족하면 PR을 만든다.

- Issue 범위의 작업이 끝났다.
- 관련 없는 변경사항이 섞이지 않았다.
- 가능한 검증을 실행했다.
- 실행하지 못한 검증이 있다면 이유를 설명할 수 있다.

AI가 특정 Issue 작업으로 만든 새 PR은 기본적으로 ready 상태로 만든다. 저장소 Codex automatic review가 켜져 있으면 새 PR이 review 대상으로 열릴 때 Codex review 결과를 기다린다. Codex Review trigger가 `매 푸시마다`로 설정된 저장소에서는 PR branch에 새 push가 들어올 때도 Codex review 결과를 기다린다.

자동 리뷰 결과는 최신 PR head commit 기준으로 확인한다. `chatgpt-codex-connector` 댓글의 `Reviewed commit`이 최신 head SHA와 일치하면 해당 커밋은 리뷰된 것으로 본다. 필수 check가 끝난 뒤 5분 동안 최신 head commit 기준 자동 리뷰 결과가 없거나 재검토가 필요한 경우에만 사용자가 PR 댓글로 `@codex review`를 직접 요청한다. AI는 기본 PR 생성 흐름에서 `@codex review` 댓글을 대신 남기지 않는다.

Draft PR은 사용자가 명시적으로 draft를 요청했거나 범위 검토를 먼저 하겠다고 합의한 경우에만 만든다. Draft PR은 ready 전환 전에는 Codex review를 기대하지 않는다.

## PR 공개 방식

PR을 만드는 방식은 두 가지로 나눈다.

| 방식     | 언제 사용하나                                   | Codex review                                   |
| -------- | ----------------------------------------------- | ---------------------------------------------- |
| Ready PR | 특정 Issue 작업을 끝내고 새 PR을 만들 때 기본값 | automatic review 결과를 기다린다.              |
| Draft PR | 사용자가 명시적으로 draft를 요청했을 때         | ready 전환 전에는 자동 리뷰를 기대하지 않는다. |

요청이 애매하더라도 특정 Issue 작업이 완료되어 PR을 만드는 상황이면 ready PR을 기본값으로 둔다. 아직 범위 합의가 되지 않았거나 사용자가 draft를 명시한 경우에만 draft PR을 만든다.

## PR 제목

권장 형식:

```text
<종류>: <한국어 요약>
```

예시:

```text
문서: GitHub 작업 흐름 정리
수정: 분석 결과 화면 간격 개선
기능: 단어장 페이지네이션 추가
```

## PR 본문

실제 GitHub PR template은 [../../.github/pull_request_template.md](../../.github/pull_request_template.md)에 둔다.

```md
## 작업 내용

- 변경 1
- 변경 2

## 확인

- [ ] 검증 명령 또는 확인 방법
- [ ] 필요한 화면 확인

## 영향 범위

- 영향받는 앱, 패키지, 문서

## 리뷰 포인트

- 특히 확인해줬으면 하는 부분

Closes #12
```

Parent issue 아래의 sub-issue 작업이라면 parent issue를 별도 줄에 함께 적는다.

```md
Closes #8
Parent: #7
```

## PR 템플릿 작성 예시

PR은 "무엇을 바꿨는지", "어떻게 확인했는지", "리뷰어가 어디를 보면 좋은지"를 중심으로 작성한다.

### 기능/개선 PR 예시

```md
## 작업 내용

- 분석 결과 화면에서 입력창과 결과 카드 사이의 간격을 조정했습니다.
- narrow 화면에서도 결과 카드가 입력 영역과 붙어 보이지 않도록 Storybook 상태를 확인했습니다.

## 확인

- [x] `pnpm --filter @nado/storybook test`
- [x] Storybook `analysis-analysisresult--narrow` 화면 확인
- [x] `git diff --check`

## 영향 범위

- `packages/ui`: 분석 결과 UI 간격
- `apps/storybook`: 분석 결과 narrow 상태

## 리뷰 포인트

- narrow 화면에서 입력창과 결과 카드 사이의 간격이 충분한지 확인해주세요.
- 기존 로딩/에러 상태의 시각적 흐름이 어색하지 않은지 확인해주세요.

Closes #18
```

### 버그 수정 PR 예시

```md
## 작업 내용

- 중복 단어 저장 시 기존 단어장 항목에 의미와 설명을 병합하도록 수정했습니다.
- 사용자별 Supabase access token 흐름과 RLS 경계를 유지했습니다.
- 중복 저장 케이스 테스트를 추가했습니다.

## 확인

- [x] `pnpm --filter @nado/api test`
- [x] `pnpm --filter @nado/shared test`
- [x] `git diff --check`
- 실행하지 못함: 실제 Supabase smoke test는 로컬 access token이 없어 생략했습니다.

## 영향 범위

- `apps/api`: 단어장 저장 API
- `packages/shared`: 단어장 요청/응답 schema

## 리뷰 포인트

- 중복 병합 로직이 다른 사용자의 단어장 항목에 영향을 주지 않는지 확인해주세요.
- 저장 실패 대신 병합으로 처리하는 정책이 학습 흐름에 맞는지 확인해주세요.

Closes #22
```

### 문서 PR 예시

```md
## 작업 내용

- GitHub Issue, branch, PR 기반 작업 흐름 문서를 추가했습니다.
- Issue 작성 예시와 PR 작성 예시를 각각 workflow 문서에 정리했습니다.
- `AGENTS.md`에서 GitHub Issue/PR 작업 시 workflow 문서를 먼저 확인하도록 연결했습니다.

## 확인

- [x] `git diff --check`
- [x] workflow 문서 내 미완성 표현 검색

## 영향 범위

- `docs/workflow`: GitHub 작업 흐름 문서
- `AGENTS.md`: AI 작업 규칙 연결

## 리뷰 포인트

- Issue 1개 = Branch 1개 = PR 1개 원칙이 문서 전반에서 일관적인지 확인해주세요.
- AI가 merge하지 않는다는 경계가 충분히 명확한지 확인해주세요.

Closes #21
```

검증을 실행하지 못했다면 체크 표시를 하지 않고 이유를 적는다.

```md
## 확인

- 실행하지 못함: 로컬 Supabase 환경변수가 없어 단어장 API smoke test는 생략
```

## Issue 연결

PR 본문 마지막에 관련 Issue를 연결한다.

```text
Closes #12
```

Sub-issue 작업 PR은 sub-issue를 닫고 parent issue를 참조한다.

```text
Closes #8
Parent: #7
```

Parent issue를 직접 닫는 PR은 만들지 않는다. Parent issue는 큰 작업의 추적용으로 두고, 모든 sub-issue가 merge된 뒤 사용자가 닫는다.

Issue가 여러 개인 경우는 원칙적으로 작업을 분리한다. 정말 하나의 PR에서 처리해야 한다면 왜 묶는지 PR 본문에 설명한다.

## Codex review 흐름

특정 Issue 작업으로 새 PR을 만들면 Codex automatic review 결과를 확인한다. 기본 흐름은 다음과 같다.

```text
1. ready PR 생성
2. 저장소 Codex automatic review 대기
3. Codex review 결과가 최신 PR head commit을 가리키는지 확인
4. 필수 check가 끝난 뒤 5분 동안 최신 head commit 기준 자동 리뷰 결과가 없으면 사용자가 PR 댓글로 `@codex review` 직접 요청
5. Codex review 결과를 사용자 리뷰와 함께 확인
```

저장소 설정에서 automatic review가 켜져 있으면 Codex가 review 대상으로 열린 PR을 자동으로 리뷰한다. push마다 자동 리뷰를 받을지는 Codex Review trigger 설정에 의존한다. automatic review는 GitHub 저장소 설정이 아니라 Codex code review 설정에 의존한다.

설정 위치와 동작 방식은 [Codex code review in GitHub](https://developers.openai.com/codex/integrations/github)를 기준으로 확인한다.

Draft PR로 만든 경우에는 바로 automatic review를 기다리지 않는다. 사용자가 ready for review로 전환하거나 수동 리뷰를 요청할 때 review 단계로 넘어간다.

최신 head commit 기준 Codex review가 달리지 않았거나 다시 확인이 필요하면 사용자가 PR 댓글로 수동 리뷰를 직접 요청한다.

```text
@codex review
```

Codex review가 수정할 항목을 남기더라도 AI가 바로 코드를 수정하지 않는다. 리뷰 수정은 사용자가 아래처럼 명시적으로 요청했을 때만 진행한다.

```text
PR #13 리뷰 반영해줘
```

AI는 리뷰를 검토한 뒤 타당한 항목만 같은 PR branch에 commit하고 push한다. 리뷰 내용이 애매하거나 기존 요구사항과 충돌하면 수정하기 전에 사용자에게 확인한다.

AI는 PR을 merge하지 않는다.

## Review 반영

사용자가 아래처럼 요청하면 AI는 기존 PR branch에서 수정한다.

```text
PR #13 리뷰 반영해줘
PR #13 수정해줘
```

AI는 다음 순서로 처리한다.

```text
1. PR과 리뷰 코멘트 확인
2. 현재 branch와 작업tree 상태 확인
3. 리뷰 내용이 타당한지 판단
4. 필요한 코드/문서 수정
5. 관련 검증 실행
6. 추가 commit
7. 같은 branch에 push
8. 반영 내용과 검증 결과 보고
```

리뷰 내용이 애매하거나 기존 요구사항과 충돌하면 바로 수정하지 않고 사용자에게 확인한다. Codex review도 외부 리뷰처럼 검토 대상이며, 모든 제안을 무조건 반영하지 않는다.

## Merge 규칙

Merge는 사용자가 한다. AI는 PR 생성과 리뷰 반영까지 돕고, merge 여부는 결정하지 않는다.

Merge 전 확인:

- PR이 관련 Issue 하나를 명확히 닫는가?
- 검증 결과가 본문 또는 코멘트에 남아 있는가?
- 관련 없는 변경사항이 섞이지 않았는가?
- 민감 정보가 포함되지 않았는가?

가능하면 squash merge로 main history를 작게 유지한다. 다만 저장소 설정이나 사용자의 별도 요청이 있으면 그 규칙을 따른다.
