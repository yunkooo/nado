# React Native Storybook 도입 검토

검토일: 2026-06-29

## 결론

Storybook for React Native는 지금 설치하지 않는다.

현재 `@nado/ui-native`는 `Button`, `Text`, `Stack`, `Card`, `Badge`, `Chip`까지 제공하지만, 앱 적용 표면은 아직 작고 상태 조합도 제한적이다. 이 단계에서 RN Storybook을 먼저 넣으면 컴포넌트 catalog보다 Expo/Metro 설정, 패키지 의존성, 실행 스크립트, CI 기준을 맞추는 비용이 더 크다.

대신 당장은 다음 검증 표면을 유지한다.

| 검증 표면                     | 역할                                              |
| ----------------------------- | ------------------------------------------------- |
| Expo app `Mobile Design Demo` | 실제 RN 화면에서 token과 primitive 샘플 확인      |
| `@nado/mobile` tests          | demo 노출 조건, mobile style, source 계약 확인    |
| `@nado/ui-native` tests       | primitive prop contract와 token-backed style 확인 |
| Web Storybook                 | Web/Desktop component와 token preview 확인        |

## 현재 상태

현재 저장소에는 RN Storybook runtime이 없다.

| 위치                          | 확인 내용                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `apps/mobile/package.json`    | Expo, React Native, `@nado/ui-native`를 사용한다. RN Storybook 의존성은 없다.     |
| `apps/storybook/package.json` | `@storybook/react-vite` 기반 Web Storybook만 운영한다.                            |
| `apps/mobile/App.tsx`         | `EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO`가 켜진 경우에만 design demo tab을 노출한다. |

## 지금 보류하는 이유

RN Storybook은 mobile component catalog가 충분히 커졌을 때 가치가 커진다. 현재는 primitive가 생겼지만 제품 화면 치환을 작은 단위로 진행하는 단계라서, 새 preview runtime보다 기존 Expo app에서 실제 화면을 보는 편이 더 직접적이다.

도입을 보류하는 주요 이유는 다음과 같다.

- Expo/Metro 설정과 Storybook runtime이 mobile dev path에 새 복잡도를 만든다.
- RN Storybook을 추가해도 디자인 값의 원본은 계속 `@nado/tokens`이므로 token parity 문제를 직접 해결하지 않는다.
- 현재 component state는 unit/source test와 Expo design demo로 확인할 수 있다.
- CI에 RN Storybook build 또는 story validation을 바로 추가하면 검증 시간이 먼저 늘어난다.
- 아직 mobile visual regression 기준이 없어서 story를 추가해도 자동 회귀 검증 효과가 제한적이다.

## 다시 검토할 조건

아래 조건 중 2개 이상이 충족되면 RN Storybook 도입을 다시 검토한다.

- `@nado/ui-native`에 `SegmentedControl`, `ReviewCard`, `Toast`, `Tooltip`처럼 state 조합이 많은 primitive가 추가된다.
- 같은 mobile primitive를 제품 화면 3곳 이상에서 사용하고, 수동 Expo 확인이 반복 비용이 된다.
- disabled, loading, selected, saved, saving, error, revealed 같은 상태 조합을 한 화면에서 비교해야 한다.
- 디자이너나 제품 검토자가 전체 앱 실행 없이 RN 컴포넌트 상태를 확인해야 한다.
- React Native Testing Library만으로는 시각적 state 검토가 부족하다는 문제가 반복된다.

## 나중에 도입한다면 첫 PR 범위

도입을 다시 선택하더라도 첫 PR은 package와 story 최소 표면만 다룬다.

첫 PR 범위:

- RN Storybook 설정을 `apps/mobile` 안 또는 별도 `apps/mobile-storybook` 앱으로 격리한다.
- 앱 production entry와 기본 Expo dev path는 바꾸지 않는다.
- `Button`, `Card`, `Badge`, `Chip`의 대표 상태 story만 추가한다.
- `@nado/tokens/react-native`와 `@nado/ui-native` import 경로가 story runtime에서 해석되는지 확인한다.
- 최소 검증 명령과 PR checklist 기준을 문서에 추가한다.

첫 PR 제외 범위:

- `@nado/core` 생성
- 기본 `@nado/ui` conditional export 개방
- visual regression infra 도입
- 모든 mobile screen을 story로 옮기기
- Maestro 또는 앱 E2E 도입

## 현재 대안

지금은 새 component token이나 `@nado/ui-native` primitive가 추가될 때만 `Mobile Design Demo`를 확장한다. 실제 제품 화면 적용은 계속 낮은 위험 표면 1곳씩 진행하고, 문서에는 어떤 반복 근거로 primitive를 만들거나 보류했는지 남긴다.

검증 기준은 다음을 우선한다.

```bash
pnpm --filter @nado/ui-native test
pnpm --filter @nado/mobile test
pnpm --filter @nado/mobile typecheck
git diff --check
```
