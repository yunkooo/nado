# 릴리스 준비도

- 마지막 코드 기준 검토: 2026-07-12
- 마지막 전체 릴리스 검증: 아직 기록 없음
- 마지막 운영 부분 검증: 2026-07-16 02:36 KST ([Notion 티켓](https://app.notion.com/p/39e8944ab9b7814b86b8c2115f65a5ae))

이 문서는 현재 코드가 운영에 나갈 준비가 되었는지 확인하는 release readiness matrix다. 작업 담당자, 일정, 우선순위와 진행 상태의 원장은 Notion `프로젝트` 하나만 사용한다. 이 문서의 미확인 항목을 작업하려면 먼저 Notion 티켓을 만들거나 기존 티켓에 연결한다.

여기의 체크는 backlog나 별도 TODO가 아니라 검증 증거의 snapshot이다. 항목을 완료로 바꿀 때는 관련 Notion 티켓 URL과 마지막 검증 시각(`YYYY-MM-DD HH:mm KST`)을 같은 티켓에 남긴다. 코드나 환경이 바뀌어 증거가 낡으면 다시 미확인으로 돌린다.

우선순위는 `P0` 배포 전 필수, `P1` 품질 마감, `P2` MVP 이후 순서다. 여기서 smoke는 핵심 경로가 연결되는지만 빠르게 확인하는 검사다.

## 준비도 요약

| 영역     | 코드 상태                      | 릴리스 기준                         | 증거 티켓 | 마지막 검증 |
| -------- | ------------------------------ | ----------------------------------- | --------- | ----------- |
| API      | 분석·단어장·인증·제한 구현     | 운영 key, proxy, `/ready`, smoke    | —         | —           |
| Web      | 학습 흐름 구현                 | 배포 origin, OAuth, 좁은 화면       | —         | —           |
| Mobile   | 학습 흐름 구현                 | iOS·Android OAuth, 실기기 API URL   | —         | —           |
| Desktop  | 학습 흐름 구현                 | 설치본 OAuth, CSP·권한, 작은 창     | —         | —           |
| Realtime | 저장·삭제 broadcast 구현       | 같은 계정 동기화와 계정 전환 격리   | —         | —           |
| CI       | format·test·DB·native·E2E 실행 | 필수 check와 실제 PR 알림 지속 확인 | —         | —           |

`증거 티켓`과 `마지막 검증`은 실제 운영 검증을 마친 뒤에만 채운다. 구현이 있다는 사실만으로 릴리스 검증 완료로 표시하지 않는다.

## P0. 운영 배포 검증

반복 가능한 순서는 [운영 배포 절차](setup/production-deployment.md)를 따른다.

- [x] Cloud Supabase에 최신 migration을 적용한다.
- [ ] Google provider와 Web·Mobile·Desktop redirect URL을 확인한다.
- [x] Railway에 server-only key, 임의의 `NADO_USAGE_IP_HASH_SALT`, CORS, 사용량 제한, proxy 설정을 확인한다.
- [ ] Vercel Web에서 운영 API 분석과 Google 로그인을 확인한다.
- [x] 운영 API에 `pnpm smoke:backend`를 실행한다.
- [x] 실제 제한값과 비용 정책을 정한다. 운영에서도 `0`을 쓸 수 있지만 무제한을 의도한 결정임을 검증 티켓에 기록한다.
- [x] `delete_expired_analysis_usage()` 일일 scheduler를 설정하고 첫 성공 실행·삭제 건수를 기록한다.

### 2026-07-16 API·Web 부분 검증

- 증거 티켓: [운영: API·Web P0 릴리스 검증](https://app.notion.com/p/39e8944ab9b7814b86b8c2115f65a5ae)
- 배포 commit: `00dac49`
- 환경: Cloud Supabase / Railway production / Vercel production
- 공개 URL: [Web](https://nado-web.vercel.app) / [API](https://nadoapi-production.up.railway.app)

통과한 경계는 다음과 같다.

- Cloud Supabase의 로컬·원격 migration 11개가 일치하고 `db push --dry-run` 결과도 최신 상태다.
- Google provider가 활성화되어 있고 Web 로그인 요청이 production Web redirect와 Cloud Supabase callback을 사용해 Google 로그인 화면까지 연결된다.
- Railway runtime은 `NODE_ENV=production`, Node.js 22.22.2이며 필수 server-only 변수 이름이 존재한다. `NADO_TRUST_PROXY=1`과 production Web CORS origin도 확인했다.
- Railway healthcheck를 `/ready`로 설정하고 재배포했다. 새 container 활성화 전 `/ready`가 `200`으로 통과했고 `/health`, `/ready`, secret 없는 기본 backend smoke도 다시 성공했다.
- Vercel production 배포가 성공했고 공개 Web bundle은 production API와 Cloud Supabase origin을 사용한다. server-only 환경변수 이름은 bundle에서 발견되지 않았다.
- Web 배포본의 로그아웃 분석과 로그인 필요 저장 안내가 동작한다.
- 운영 일일 분석 제한은 익명·인증 사용자 모두 `0`으로, MVP 기준 사용량은 기록하되 차단하지 않는 정책이다.
- `pg_cron` 정리 job의 첫 실행이 성공했다. 90일 초과 삭제 건수는 0건이며, 이후 매일 `03:00 UTC`에 `delete_expired_analysis_usage(90)`을 실행한다. `anon`과 `authenticated` 역할에는 실행 권한이 없다.

아래 경계가 남아 있어 전체 P0 완료로 표시하지 않는다.

- 기본 GLM 분석에서 schema가 허용한 `status`·`result` 조합을 runtime parser가 거부해 `502 invalid_analysis_response`가 1회 발생했다. 후속 요청은 성공했지만 간헐 실패가 확인되어 [GitHub Issue #168](https://github.com/yunkooo/nado/issues/168)에서 별도로 수정한다.
- Google OAuth는 Google 로그인 화면 진입까지 확인했다. 검증 계정 인증이 필요한 로그인 완료, 추천 저장, 단어장 반영, 삭제, 복습 흐름은 아직 실행하지 않았다.
- Supabase Security Advisor의 `Leaked Password Protection Disabled` 경고가 남아 있다. 제품 UI는 Google 로그인을 사용하지만 Email provider도 활성 상태이므로 후속 보안 정책에서 Email Auth 유지 여부와 보호 기능을 함께 결정한다.

## P0. 크로스 플랫폼 학습 흐름

각 플랫폼에서 같은 검증 계정으로 아래 흐름을 한 번에 확인한다.

```text
로그인 → 분석 → 추천 저장 → 단어장 반영 → 삭제 → 복습
```

- [ ] Web 배포본
- [ ] iOS simulator 또는 실기기
- [ ] Android emulator 또는 실기기
- [ ] Desktop `tauri:dev`
- [ ] Desktop 설치본
- [ ] 계정 전환 시 이전 분석 결과와 Realtime 이벤트가 섞이지 않는지 확인

## P1. 사용자 경험 마감

- [ ] 긴 문장 조각(chunk), 긴 단어, 긴 뜻이 좁은 화면에서 깨지지 않는지 확인한다.
- [ ] 키보드만으로 분석, 단어 확인, 저장, 복습이 가능한지 확인한다.
- [ ] 도움말 창(popover)이 화면 가장자리에서 잘리지 않는지 확인한다.
- [ ] OAuth 취소·실패·재시도 메시지를 플랫폼별로 확인한다.
- [ ] loading, empty, error, timeout 상태에서 다시 시도할 수 있는지 확인한다.
- [ ] Desktop 작은 창과 Mobile 키보드가 주요 버튼을 가리지 않는지 확인한다.

## P1. 운영 문서와 기록

- [x] Railway, Cloud Supabase, Vercel 운영 확인 절차를 비밀값 없이 [운영 배포 문서](setup/production-deployment.md)에 남긴다.
- [ ] 플랫폼 검증 결과를 날짜·환경·실패 지점과 함께 관련 Notion 티켓에 기록한다.
- [ ] 새 UI 변경 시 Storybook 또는 Mobile demo 검증 결과를 PR과 관련 Notion 티켓에 남긴다.
- [ ] Notion Ticket Sync와 Slack 알림이 실제 PR에서 계속 동작하는지 확인한다.

## P2. 제품 확장

MVP 운영 검증이 끝난 뒤 [확장 후보](prd/03-expansion.md)에서 다음 PRD를 고른다. 검색·필터, 긴 글 분석, 예문, 간격 반복, 분석 히스토리, 브라우저 확장, 결제를 동시에 진행하지 않는다. 선택과 진행 상태는 Notion `프로젝트` 티켓에서 관리한다.

## 권장 검증 순서

이 순서는 릴리스 검증의 의존 관계일 뿐 작업 원장이 아니다.

1. 운영 API와 Web 배포본 smoke 검증
2. Mobile OAuth와 실기기 흐름
3. Desktop 설치본과 OAuth 흐름
4. 계정 전환·Realtime 교차 검증
5. UX 마감 후 확장 후보 재평가
