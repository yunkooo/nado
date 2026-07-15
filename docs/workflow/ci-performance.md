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

## 2차 개선: Desktop Rust 캐시 갱신 정책

1차 구조의 Rust 캐시는 Cargo 다운로드와 `target` 산출물을 한 key로 저장하고 `Cargo.lock`만 추적했다. 이 방식은 Rust 소스나 Desktop이 사용하는 workspace package가 바뀌어도 기존 key가 계속 exact hit가 되어, 변경된 입력으로 빌드한 최신 `target`을 새 캐시로 저장할 수 없었다.

2차 개선에서는 다음과 같이 책임과 갱신 조건을 분리했다.

- Cargo dependency 캐시: OS, CPU architecture, Rust host/release, `Cargo.lock`
- Desktop target 캐시: Cargo dependency 입력과 Desktop build 입력 hash
- Desktop build 입력: root workspace 설정, `apps/desktop`, Desktop이 사용하는 shared/token/UI package
- restore 정책: 동일 Rust toolchain과 `Cargo.lock`의 직전 target을 증분 빌드 기반으로 사용
- 관측성: Cargo와 target의 exact hit 여부를 job summary에 별도로 기록

새 cache namespace의 첫 실행은 cold cache이고, 같은 head를 두 번 재실행해 exact hit가 재현되는지 확인했다. 전체 시간은 GitHub Actions run의 `run_started_at`부터 `updated_at`까지이며, runner 합계는 run에 포함된 모든 job의 실행 시간을 더한 값이다.

| 실행                                                                       | Cargo / target |  전체 CI | Desktop native | Rust release compile | runner 합계 |
| -------------------------------------------------------------------------- | -------------- | -------: | -------------: | -------------------: | ----------: |
| [1차](https://github.com/yunkooo/nado/actions/runs/29431786500/attempts/1) | miss / miss    | 4분 59초 |       4분 49초 |             3분 47초 |    14분 2초 |
| [2차](https://github.com/yunkooo/nado/actions/runs/29431786500/attempts/2) | hit / hit      | 3분 24초 |       2분 40초 |              40.16초 |   11분 59초 |
| [3차](https://github.com/yunkooo/nado/actions/runs/29431786500/attempts/3) | hit / hit      | 3분 32초 |       1분 44초 |              38.14초 |   10분 35초 |

exact hit 두 번의 중앙값은 전체 CI `3분 28초`, Desktop native `2분 12초`, Rust compile `39.15초`, runner 합계 `11분 17초`다. cold 실행과 비교하면 전체 대기 시간은 `1분 31초`(`30.4%`), Desktop native는 `2분 37초`(`54.3%`), Rust compile은 `3분 7.85초`(`82.8%`), runner 합계는 `2분 45초`(`19.6%`) 줄었다.

Cargo cache는 약 `56 MB`, Desktop target cache는 약 `418 MB`였다. exact hit에서도 cache 다운로드, Ubuntu package 설치, runner 성능 편차가 포함되므로 Desktop job 전체 시간은 `1분 44초`에서 `2분 40초`로 흔들렸다. 따라서 이 변경의 핵심은 가장 빠른 단일 수치가 아니라 다음 두 가지다.

- Desktop 입력 변경 시 새 target key가 생겨 최신 빌드 산출물을 저장한다.
- 입력이 같은 재실행에서는 두 캐시가 모두 exact hit이고 Rust compile이 약 39초로 재현된다.

1차 개선의 첫 전체 성공 run `4분 51초`와 비교하면 새 namespace의 cold 실행은 `8초` 길었지만, exact hit 중앙값은 `1분 23초`(`28.5%`) 짧다. warm 실행에서는 Supabase 검증이 `3분 17초`, `3분 25초`로 가장 오래 걸려 전체 workflow의 핵심 경로가 Desktop에서 database job으로 이동했다.
