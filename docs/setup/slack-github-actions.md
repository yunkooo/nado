# Slack GitHub Actions 알림

이 문서는 GitHub Actions에서 `nado`의 PR 리뷰 요청과 CI 실패를 Slack으로 알리는 설정 방법을 정리한다.

## 목적

Slack 알림은 리뷰 요청과 실패 대응을 빠르게 공유하기 위한 보조 장치다. 이번 범위에서는 알림 noise를 줄이기 위해 성공 알림은 보내지 않는다.

## Workflow 구성

| Workflow              | 파일                                                                                       | 역할                                                            |
| --------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| CI                    | [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml)                           | `lint`, `typecheck`, `test`를 실행하고 실패하면 Slack에 알린다. |
| Slack PR Notification | [../../.github/workflows/slack-pr-notify.yml](../../.github/workflows/slack-pr-notify.yml) | PR 생성, reopen, ready 전환 시 Slack에 리뷰 요청 알림을 보낸다. |

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
```

위 명령 중 하나라도 실패하면 Slack 알림을 보낸다.

알림에는 다음 정보가 포함된다.

- workflow 이름
- branch
- actor
- commit SHA
- GitHub Actions run 링크

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

## 이번 범위에서 제외한 것

- Slack slash command
- Slack에서 GitHub Issue 생성
- 자동 merge
- 성공 알림
- 배포 완료 알림
- smoke test 자동 실행
