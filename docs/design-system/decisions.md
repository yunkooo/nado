# 디자인 시스템 결정

현재 유지할 설계 결정만 모은다. 새로운 근거가 생기면 이 표를 갱신하거나 별도 Issue를 만든다.

| 주제                   | 현재 결정                                                 | 다시 검토할 때                                          |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 공유 방식              | Token-first, 플랫폼별 구현                                | 같은 의미의 token이나 prop이 계속 어긋날 때             |
| `@nado/ui` root        | Web 호환 공개 진입점으로 유지                             | bundler별 conditional export를 안전하게 검증했을 때     |
| Web import             | `/web` 경로 우선, 측정된 경우 `@nado/ui-web` subpath 허용 | package 경계 또는 bundle 정책 변경 시                   |
| Mobile import          | root가 아닌 `@nado/ui/native` 사용                        | Native 공개 경로 구조 변경 시                           |
| React Native Storybook | 도입 보류, Expo demo와 test 사용                          | 공통 RN component와 상태 조합이 크게 늘 때              |
| `@nado/core`           | 생성 보류, 공통 runtime helper는 `@nado/shared`에서 검토  | 도메인과 무관한 runtime utility가 여러 앱에서 반복될 때 |
| Avatar                 | 구현 보류                                                 | identity visual이 두 곳 이상에서 반복될 때              |
| SegmentedControl       | 구현 보류                                                 | 같은 선택 control이 두 곳 이상에서 반복될 때            |
| Chip 저장 상태         | 저장 상태 계산은 앱에 유지                                | 여러 기능이 같은 저장 상태 machine을 공유할 때          |

## 결정 원칙

- 완료된 마이그레이션 단계를 현재 문서에 작업 일지로 반복하지 않는다.
- 패키지는 예상되는 재사용이 아니라 확인된 반복을 기준으로 만든다.
- Storybook은 Web/Desktop 검증, Expo demo는 Mobile 검증을 담당한다.
- 새 도구를 추가하기 전에 기존 test와 demo로 확인할 수 없는 문제가 무엇인지 먼저 적는다.
