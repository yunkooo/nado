# Slack과 GitHub Actions

Slack 알림은 PR 리뷰 요청과 CI 실패를 빠르게 공유하는 보조 수단이다. 성공 알림과 자동 merge는 제공하지 않는다.

## 구성

| 역할                       | 파일                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| 정적 검증·native smoke·E2E | [CI workflow](../../.github/workflows/ci.yml)                              |
| PR 리뷰 요청 알림          | [Slack PR workflow](../../.github/workflows/slack-pr-notify.yml)           |
| checkout 이후 실패 payload | [공통 Slack action](../../.github/actions/notify-slack-failure/action.yml) |

## 설정

GitHub Repository Secret에 아래 값을 추가한다.

```text
SLACK_WEBHOOK_URL
```

```text
GitHub repository
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

Webhook URL은 `.env`, workflow, 문서, PR 본문에 직접 적지 않는다. 값이 없으면 알림 step은 건너뛴다.

## 알림 시점

### PR 리뷰 요청

draft가 아닌 PR의 다음 이벤트에서 알린다.

- opened
- reopened
- ready for review

알림에는 PR 번호, 제목, 링크, 작성자, head/base branch가 포함된다.

### CI 실패

CI는 PR 변경과 `main` push에서 format, lint, typecheck, test, build, Mobile Expo native generation/export, Desktop Tauri compile, Supabase clean reset·DB lint·security/performance advisor·pgTAP, Storybook browser test, E2E를 실행한다. 같은 검증을 로컬에서 실행하는 방법은 [로컬 개발의 검증 단계](local-development.md#8-검증)를 참고한다.

실패 알림에는 workflow, job, branch, actor, commit, Actions run 링크가 포함된다. checkout 전에 실패하면 repository의 local action을 읽을 수 없으므로 CI workflow의 inline fallback을 사용한다.

## E2E 범위

현재 E2E smoke는 secret 없이 실행할 수 있는 범위만 포함한다.

- API `GET /health`
- Web 분석 화면 렌더링
- 입력창과 200자 제한
- 좁은 화면 navigation drawer 열기
- `Tab`·`Shift+Tab` focus trap, `Escape` 닫기와 메뉴 버튼 focus 복원

OAuth, 실제 AI provider, 단어장 전체 흐름은 별도 운영 smoke 또는 수동 검증으로 확인한다.

## 실패 확인 순서

아래 명령을 사용하려면 [GitHub CLI](https://cli.github.com/)를 설치하고 `gh auth login`으로 로그인해야 한다.

```bash
gh run list --repo yunkooo/nado --branch <branch-name> --limit 5
gh run view <run-id> --repo yunkooo/nado --log-failed
```

1. 실패한 job과 step을 확인한다.
2. 핵심 오류가 코드, 환경변수, 외부 서비스 중 어디에서 발생했는지 구분한다.
3. 재실행 전에 같은 오류를 로컬 명령으로 재현할 수 있는지 확인한다.
4. 사용자에게 run 링크, 원인, 다음 조치를 요약한다.

Slack 알림은 merge 승인이나 리뷰 통과를 의미하지 않는다. merge 여부는 사용자가 결정한다.
