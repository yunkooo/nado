# Slack GitHub Actions 알림

이 문서는 GitHub Actions에서 `nado`의 PR 리뷰 요청과 CI 실패를 Slack으로 알리는 설정 방법을 정리한다.

## 목적

Slack 알림은 리뷰 요청과 실패 대응을 빠르게 공유하기 위한 보조 장치다. 이번 범위에서는 알림 noise를 줄이기 위해 성공 알림은 보내지 않는다.

## Workflow 구성

| Workflow              | 파일                                                                                                           | 역할                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| CI                    | [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml)                                               | `lint`, `typecheck`, `test`, `build`, `e2e`를 실행하고 실패하면 Slack에 알린다. |
| Slack PR Notification | [../../.github/workflows/slack-pr-notify.yml](../../.github/workflows/slack-pr-notify.yml)                     | PR 생성, reopen, ready 전환 시 Slack에 리뷰 요청 알림을 보낸다.                 |
| Slack failure action  | [../../.github/actions/notify-slack-failure/action.yml](../../.github/actions/notify-slack-failure/action.yml) | checkout 이후 CI job 실패 알림 payload를 공통으로 만든다.                       |

## 필요한 GitHub Secret

Repository secret에 아래 값을 추가한다.

```text
SLACK_WEBHOOK_URL
```

설정 위치:

```text
GitHub repository
-> Settings
-> Secrets and variables
-> Actions
-> New repository secret
```

Webhook URL은 Slack Incoming Webhook에서 발급한 값을 사용한다. 이 값은 secret이므로 `.env`, 문서, workflow 파일, PR 본문에 직접 적지 않는다.

## 알림이 전송되는 경우

### PR 리뷰 요청 알림

아래 이벤트에서 PR이 draft가 아니면 Slack 알림을 보낸다.

- `pull_request.opened`
- `pull_request.reopened`
- `pull_request.ready_for_review`

알림에는 다음 정보가 포함된다.

- PR 번호와 제목
- PR 링크
- 작성자
- head branch와 base branch
- PR 본문 검증 항목과 Codex automatic review 확인 안내

### CI 실패 알림

CI는 아래 이벤트에서 실행된다.

- PR 생성, push, reopen, ready 전환
- `main` branch push

CI에서 실행하는 명령:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

위 명령 중 하나라도 실패하면 Slack 알림을 보낸다.

알림에는 다음 정보가 포함된다.

- workflow 이름
- 실패한 job 이름
- branch
- actor
- commit SHA
- GitHub Actions run 링크

checkout 실패는 repository 파일을 내려받기 전이라 로컬 composite action을 사용할 수 없다. 이 경우에는 workflow 안의 inline fallback step이 Slack payload를 직접 만든다. checkout 이후 단계에서 실패하면 `.github/actions/notify-slack-failure` local action을 사용한다.

### E2E smoke 검증

E2E smoke는 Playwright로 실행한다.

```bash
pnpm e2e:install
pnpm e2e
```

현재 smoke 범위는 외부 비밀값 없이 실행 가능해야 한다.

- API `GET /health`
- 웹 분석 화면 렌더링
- 분석 입력창 표시
- 200자 제한 카운터와 전송 버튼 상태

OAuth 로그인, 실제 OpenAI 분석, 단어 저장/복습 연동은 별도 인증 fixture와 운영 secret이 필요하므로 후속 범위로 둔다.

## 알림이 전송되지 않는 경우

- `SLACK_WEBHOOK_URL` secret이 없으면 알림 step을 건너뛴다.
- 성공한 CI run은 알리지 않는다.
- draft PR은 ready 전환 전까지 리뷰 요청 알림을 보내지 않는다.
- 외부 fork PR에서는 GitHub secret이 전달되지 않을 수 있으므로 Slack 알림이 생략될 수 있다.

## 운영 기준

- Slack 알림은 merge 승인이나 리뷰 통과를 의미하지 않는다.
- PR merge 여부는 사용자가 결정한다.
- CI 실패 알림을 받으면 GitHub Actions run 링크에서 실패한 job과 step을 먼저 확인한다.
- Codex automatic review 결과는 PR 화면에서 최신 head commit 기준으로 확인한다.
- AI 에이전트가 push를 수행했다면 push 직후 최신 GitHub Actions run을 확인하고 완료 상태를 사용자에게 요약한다.

## AI 에이전트 push 후 모니터링

AI 에이전트가 `git push`를 수행한 경우 다음 순서로 상태를 확인한다.

```bash
gh run list --repo yunkooo/nado --branch <branch-name> --limit 5
gh run watch <run-id> --repo yunkooo/nado
```

실패하면 실패 로그를 확인한다.

```bash
gh run view <run-id> --repo yunkooo/nado --log-failed
```

사용자에게는 아래 내용을 요약한다.

- 실행된 workflow와 run 링크
- 실패한 job과 step
- 핵심 오류 메시지
- 원인 후보
- 다음 조치

Slack에 수동 상태 공유가 필요한 경우에도 위 요약을 기준으로 보낸다.

## 이번 범위에서 제외한 것

- Slack slash command
- Slack에서 GitHub Issue 생성
- 자동 merge
- 성공 알림
- 배포 완료 알림
- OAuth/단어장/복습 전체 e2e
