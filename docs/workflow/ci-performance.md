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
- `Mobile native`: Expo prebuild, pod lock, platform export, design bundle
- `Desktop native`: Tauri Linux dependency 설치와 native build

외부 branch protection은 바꾸지 않는다. 기존 `Lint, typecheck, test, build` 이름을 집계 gate로 유지하고 matrix의 실패나 취소를 실패로 전달한다. `E2E smoke`는 다른 job의 결과물을 사용하지 않으므로 선행 의존성을 제거해 처음부터 병렬 실행한다.

## 전후 비교

| 지표       |         변경 전 | 1차 개선 후 |      차이 |
| ---------- | --------------: | ----------: | --------: |
| 전체 PR CI | 중앙값 7분 12초 |   측정 예정 | 측정 예정 |
| 실행 범위  |       전체 검증 |   전체 검증 | 축소 없음 |

개선 PR의 첫 전체 성공 run이 끝나면 run URL, 전체 시간, 중앙값 대비 절감 시간과 절감률, 가장 오래 걸린 job을 이 표에 기록한다.
