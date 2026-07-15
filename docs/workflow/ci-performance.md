# CI 성능 기록

이 문서는 PR 필수 검증의 구조 변경이 실제 피드백 시간을 줄였는지 같은 기준으로 비교한다. 빠른 실행 한 건만 골라 성과로 쓰지 않고, 변경 전 분포와 변경 후 실제 PR run을 함께 남긴다.

## 측정 기준

- 대상 workflow: `.github/workflows/ci.yml`의 `CI`
- 대상 event: `pull_request`
- 전체 시간: GitHub Actions의 `run_started_at`부터 `updated_at`까지
- 변경 전 기준선: 2026-07-15에 조회한 최근 성공 run 10건
- 변경 후 값: 병렬화 PR에서 모든 job이 처음 성공한 run
- 절감률: `(변경 전 중앙값 - 변경 후 시간) / 변경 전 중앙값 * 100`

runner 대기, GitHub-hosted runner 성능 편차, Rust cache 상태가 포함되므로 한 번의 값은 절대적인 benchmark가 아니다. 후속 개선도 같은 기준과 표에 추가한다.

## 변경 전 기준선

최근 성공한 PR run 10건은 `6분 42초`에서 `9분 46초` 사이였고 중앙값은 `7분 12초`였다.

| 지표     |                                                                           변경 전 |
| -------- | --------------------------------------------------------------------------------: |
| 표본     |                                                                성공한 PR run 10건 |
| 중앙값   |                                                                          7분 12초 |
| 최솟값   |                                                                          6분 42초 |
| 최댓값   |                                                                          9분 46초 |
| 최근 run | [29409070210](https://github.com/yunkooo/nado/actions/runs/29409070210), 9분 46초 |

## 1차 개선

기존 `verify` job 안에서 직렬로 실행하던 검증을 다음 matrix로 분리한다.

- `Quality`: format, lint, typecheck, test, build
- `Mobile native`: workspace dependency build, Expo prebuild, pod lock, platform export, design bundle
- `Desktop native`: Tauri Linux dependency 설치와 native build

외부 branch protection은 바꾸지 않는다. 기존 `Lint, typecheck, test, build` 이름을 집계 gate로 유지하고 matrix의 실패나 취소를 실패로 전달한다. `E2E smoke`는 다른 job의 결과물을 사용하지 않으므로 선행 의존성을 제거해 처음부터 병렬 실행한다.

## 전후 비교

| 지표       |         변경 전 | 1차 개선 후 |                      차이 |
| ---------- | --------------: | ----------: | ------------------------: |
| 전체 PR CI | 중앙값 7분 12초 |    4분 51초 | 2분 21초 단축, 32.6% 감소 |
| 실행 범위  |       전체 검증 |   전체 검증 |                 축소 없음 |

개선 후 값은 [PR #162의 첫 전체 성공 run 29412474053](https://github.com/yunkooo/nado/actions/runs/29412474053)에서 측정했다. 전체 workflow는 2026-07-15 11:40:46 UTC부터 11:45:37 UTC까지 `4분 51초`가 걸렸다. 변경 전 최근 run `9분 46초`와 비교하면 `4분 55초`, `50.3%` 짧다.

| Job                                    | 소요 시간 |
| -------------------------------------- | --------: |
| Desktop native                         |  4분 42초 |
| Supabase migrations and database tests |  2분 55초 |
| Mobile native                          |  2분 21초 |
| Quality                                |   2분 1초 |
| E2E smoke                              |   1분 8초 |
| Lint, typecheck, test, build gate      |       2초 |

다섯 실검증 job은 workflow 시작 시 함께 실행됐고, required gate는 matrix 완료 직후 성공했다. 첫 시도 run `29412076210`은 Mobile export가 기존 직렬 `pnpm build`의 산출물을 암묵적으로 사용하던 문제로 실패해 성능 표본에서 제외했다. Mobile job이 pnpm workspace dependency graph로 필요한 package를 직접 build하도록 고친 뒤 전체 검증이 성공했다.

1차 개선 후 핵심 경로는 `Desktop native`다. Tauri compile cache 편차가 큰 상태에서도 중앙값 대비 32.6% 단축됐으며, 다음 단계에서는 Rust cache key와 저장 정책을 독립 티켓으로 검토한다.
