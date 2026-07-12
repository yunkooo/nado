# nado 문서 안내

이 디렉터리는 현재 제품과 개발 흐름을 설명하는 문서만 유지한다. 처음 보는 사람은 필요한 목적에 따라 아래 문서부터 읽으면 된다.

## 어디서 시작할까?

| 목적                             | 먼저 읽을 문서                                            |
| -------------------------------- | --------------------------------------------------------- |
| 프로젝트를 이해하고 싶다         | [제품 요구사항](../PRD.md)                                |
| 로컬에서 실행하고 싶다           | [로컬 개발](setup/local-development.md)                   |
| 출시할 준비가 되었는지 알고 싶다 | [릴리스 준비도](release-readiness.md)                     |
| Issue나 PR 작업을 하고 싶다      | [협업 워크플로](workflow/README.md)                       |
| 공통 UI 구조를 이해하고 싶다     | [디자인 시스템](design-system/README.md)                  |
| Realtime 동기화를 검증하고 싶다  | [단어장 Realtime 검증](setup/realtime-vocabulary-sync.md) |
| 운영 환경에 배포하고 싶다        | [운영 배포](setup/production-deployment.md)               |
| Slack 알림을 설정하고 싶다       | [Slack과 GitHub Actions](setup/slack-github-actions.md)   |

## 문서 구조

```text
docs/
├── README.md              문서 시작점
├── release-readiness.md   출시 전 검증 증거
├── prd/                   제품 요구사항
├── setup/                 로컬 실행, 배포와 운영 검증
├── workflow/              Issue, PR, Notion 작업 흐름
└── design-system/         공통 token과 UI 계약
```

## 문서별 역할

- `PRD.md`와 `docs/prd/`: 무엇을 만들고 무엇을 만들지 않을지 정의한다.
- `docs/setup/`: 실제 환경을 준비하고 문제를 확인하는 순서를 설명한다.
- `docs/workflow/`: 사람과 AI가 같은 방식으로 작업을 추적하는 규칙을 설명한다.
- `docs/design-system/`: 현재 패키지 경계와 플랫폼별 UI 규칙을 설명한다.
- `docs/release-readiness.md`: 운영·실기기 검증 증거를 요약한다. backlog나 진행 상태는 관리하지 않는다.

작업 담당자, 우선순위와 진행 상태의 원장은 Notion `프로젝트` 하나만 사용한다. 문서의 미확인 항목을 작업할 때도 먼저 Notion 티켓을 만들거나 기존 티켓에 연결한다.

## 정보가 다를 때

문서와 구현이 다르면 아래 순서로 확인한다.

1. 실제 코드와 테스트
2. `.env.example`, 패키지 설정, GitHub Actions
3. 이 디렉터리의 현재 문서
4. Git 이력에 남은 과거 계획

과거 구현 계획과 완료된 점검 기록은 현재 문서에 반복해서 보관하지 않는다. 결정이 여전히 유효하면 해당 영역의 README나 계약 문서에 결론만 남긴다.

## 문서 수정 원칙

- 같은 규칙은 한 문서에서만 자세히 설명하고 다른 문서에서는 링크한다.
- 실제 명령, 환경변수, 템플릿과 다른 예시는 남기지 않는다.
- 완료된 작업 기록보다 현재 구조와 다음 행동을 우선한다.
- 민감한 key와 실제 secret 값은 문서에 적지 않는다.
