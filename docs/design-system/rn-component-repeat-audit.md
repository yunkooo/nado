# RN component repeat audit

이 문서는 `@nado/ui-native` 생성 전에 Mobile React Native 화면에서 `Button`, `Text`, `Stack` 성격의 반복이 실제로 있는지 점검한 기록이다.

점검일: 2026-06-25

## 점검 범위

확인한 주요 파일은 다음이다.

| 파일                                                              | 확인한 내용                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/mobile/App.tsx`                                             | 실제 앱 화면의 `Pressable`, `Text`, `View` 조합        |
| `apps/mobile/src/features/design/MobileTokenParityDemoScreen.tsx` | mobile token parity demo의 버튼, 텍스트, 레이아웃 샘플 |
| `apps/mobile/src/styles/mobileStyles.ts`                          | RN-local style 원장과 `nativeTokens` 사용              |
| `apps/mobile/src/styles/mobileStyles.test.ts`                     | mobile style token 계약을 보호하는 테스트              |

## 결론

`Button`, `Text`, `Stack` 반복은 확인되었다. 이 점검 결과 다음 독립 PR로 `@nado/ui-native` 최소 API 구현을 선택했다.

현재 `packages/ui-native`는 이 최소 API에서 시작해 `Button`, `Text`, `Stack`, `Card`, `Badge`, `Chip`을 제공하고, `@nado/ui/native` facade도 이 패키지를 re-export한다. 앱 전체 마이그레이션은 여전히 후속 PR 단위로 작게 분리한다.

다만 현재 Mobile은 아직 `App.tsx` 단일 화면 조합과 `mobileStyles` 중심 구조가 강하다. 첫 구현 PR에서 앱 전체를 대규모로 마이그레이션하지 않는다. `packages/ui-native`를 만들더라도 최소 primitive와 테스트를 먼저 만들고, 실제 화면 적용은 token parity demo 같은 낮은 위험 표면부터 시작한다.

## 반복 확인

### Button

반복은 충분하다.

현재 `mobileStyles`에는 같은 button token을 공유하는 style이 여러 개 있다.

| 현재 style                                                                                          | 반복 성격                                          |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `primaryButton`, `primaryButtonText`                                                                | 복습 다음 버튼 등 primary action                   |
| `secondaryButton`, `secondaryButtonText`                                                            | 삭제, 정답 보기 같은 secondary action              |
| `analyzeButton`, `analyzeButtonText`                                                                | send/icon button token                             |
| `designDemoPrimaryButton`, `designDemoSecondaryButton`, `designDemoSendIconButton`                  | token parity demo의 button contract 샘플           |
| `loginButton`, `modelSelectButton`, `reviewDirection`, `wordDefinitionSaveButton`, `suggestionChip` | 버튼에 가깝지만 제품별 상태와 레이아웃이 섞인 후보 |

첫 `@nado/ui-native` Button 후보는 다음 범위로 제한한다.

- `variant`: `primary`, `secondary`, `ghost`, `send`
- `size`: `sm`, `md`, `icon`
- `disabled`, `isLoading`, `accessibilityLabel`, `onPress`
- `@nado/tokens/react-native`의 `nativeTokens.component.button` 사용

`suggestionChip`, `reviewDirection`, `wordDefinitionSaveButton`은 버튼 성격이 있지만 제품 상태와 copy, 레이아웃이 강하므로 첫 primitive에 바로 흡수하지 않는다.

### Text

반복은 있으나 모든 텍스트 style을 한 번에 합치면 위험하다.

현재 `mobileStyles`에는 `eyebrow`, `pageTitle`, `sectionTitle`, `panelText`, `statusText`, `primaryButtonText`, `secondaryButtonText`, `tabText`처럼 의미별 텍스트 style이 많다. 이 중 일부는 제품 화면 의미가 강하고, 일부는 primitive `Text` prop으로 표현할 수 있다.

첫 `@nado/ui-native` Text 후보는 다음 범위로 제한한다.

- `size`: `xs`, `sm`, `md`, `lg`, `xl`
- `weight`: `regular`, `medium`, `bold`, `heavy`
- `tone`: `default`, `muted`, `primary`, `danger`
- `align`: `start`, `center`, `end`
- RN `Text`의 `style` override는 허용하되, token 기반 기본값을 먼저 적용

`pageTitle`, `statusTitle`, `reviewTerm`처럼 화면의 정보 구조와 강하게 묶인 style은 첫 PR에서 바로 삭제하지 않는다.

### Stack

반복은 충분하다.

현재 `mobileStyles`에는 `pageStack`, `pageLayout`, `pageTitleGroup`, `sectionHeader`, `sectionTitleGroup`, `reviewActions`, `reviewControls`, `suggestionList`, `translationNoteList`, `meaningList`처럼 `View`에 `gap`, `flexDirection`, `alignItems`를 조합하는 Stack류 style이 반복된다.

첫 `@nado/ui-native` Stack 후보는 다음 범위로 제한한다.

- `gap`: `xs`, `sm`, `md`, `lg`, `xl`
- `direction`: `vertical`, `horizontal`
- `align`: `start`, `center`, `end`, `stretch`
- RN `View`의 `style` override 허용

`reviewActions`처럼 `flex: 1`, `width`, `minWidth`까지 포함한 화면별 레이아웃은 첫 primitive로 흡수하지 않고 `Stack` 위에 screen-local style을 얹는 방식으로 둔다.

## 첫 `@nado/ui-native` PR 범위

첫 구현 PR의 범위는 아래가 적당하다.

- `packages/ui-native` 패키지를 만든다.
- `Button`, `Text`, `Stack`을 export한다.
- `@nado/tokens/react-native`를 dependency로 사용한다.
- 최소 테스트로 token-backed style contract를 고정한다.
- 위험을 낮추기 위해 `MobileTokenParityDemoScreen`부터 적용하거나, 앱 적용 없이 package contract만 먼저 검증한다.

첫 PR에서 하지 않는 일:

- `App.tsx` 전체 버튼, 텍스트, 레이아웃 마이그레이션
- `Card`, `Badge`, `Avatar` 같은 추가 component 구현
- toast, tooltip, popover, tab, refresh button 일반화
- `@nado/ui` 기본 conditional export 개방
- Storybook for React Native 도입

## 후속 진행 상태

이후 별도 PR에서 `Card`, `Badge`, `Chip`은 반복 점검과 최소 구현, 일부 실제 화면 적용까지 진행했다.

| Component | 현재 상태                                                                                     |
| --------- | --------------------------------------------------------------------------------------------- |
| `Card`    | Mobile card 반복 점검 뒤 `@nado/ui-native` 구현과 낮은 위험 화면 적용 완료                    |
| `Badge`   | `vocabularyType` 반복을 기준으로 Web/Desktop과 Mobile 구현 완료                               |
| `Chip`    | Mobile `suggestionChip`을 action chip 후보로 분리하고 Native Chip 적용 완료                   |
| `Avatar`  | [Avatar 반복 점검과 도입 기준](avatar-repeat-audit.md)에 따라 반복 기준 충족 전까지 구현 보류 |

## `@nado/ui/native` 개방 기준

`@nado/ui/native` subpath는 `@nado/ui-native`가 생긴 뒤에 연다. 현재 이 facade는 열려 있으며 `@nado/ui-native`를 re-export한다.

추가 적용 전 확인할 것:

- Expo/Metro가 `@nado/ui/native`를 source 또는 build output으로 안정적으로 해석한다.
- `@nado/mobile` test와 typecheck가 통과한다.
- Web/Desktop의 `@nado/ui`와 `@nado/ui/web` import가 영향을 받지 않는다.
- `Button`, `Text`, `Stack`의 prop 의미가 [Component API contracts](component-api-contracts.md)와 맞다.

## 다음 결정

반복 점검 결과에 따라 `@nado/ui-native` 최소 API를 만들었다. 낮은 위험 표면인 `MobileTokenParityDemoScreen`은 `@nado/ui/native` facade를 통해 `Button`, `Text`, `Stack`을 사용한다. 이후 `Card`, `Badge`, `Chip`은 작은 PR로 확장되었다. 다음 단계는 새 반복 surface가 생길 때만 추가 Mobile 적용 표면을 고르고, `Avatar`는 identity visual 반복이 확인될 때 다시 구현 여부를 판단하는 것이다.
