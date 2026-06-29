# Token parity demo 검증 흐름

이 문서는 `@nado/tokens` 변경이 Web, Desktop, Mobile 검증 표면에 함께 드러나는지 확인하는 기준 흐름이다.

목표는 웹 CSS 값을 모바일이 따라 쓰게 만드는 것이 아니다. 디자인 값의 원본을 `@nado/tokens`에 두고, Web/Desktop은 `@nado/ui`, Mobile은 `@nado/tokens/react-native`와 `@nado/ui/native`를 통해 같은 의미의 token과 primitive contract를 사용하게 만드는 것이다.

## 확인 표면

| 플랫폼                 | 확인 위치                      | 확인 내용                                                                                         |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Web/Desktop foundation | Storybook `Foundations/Tokens` | color, radius, button component token, chip component token, reviewCard answer component token 값 |
| Web/Desktop component  | Storybook `UI/Button`          | `primary`, `secondary`, `send`, `md`, `icon` 버튼 상태                                            |
| Web app surface        | Storybook `WebSurface`         | 실제 웹 mock surface에서 token이 끊기지 않는지                                                    |
| Desktop app surface    | Storybook `DesktopSurface`     | desktop shell mock surface에서 token이 끊기지 않는지                                              |
| Mobile                 | Expo app `Mobile Design Demo`  | `nativeTokens`와 `@nado/ui/native`를 통과한 primary color, surface, radius, spacing, button token |

## 변경 기준

token 변경 요청이 들어오면 먼저 변경 종류를 나눈다.

| 변경 종류           | 우선 수정 위치                                   | 확인 표면                                                                     |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| 색상 변경           | `packages/tokens/src/tokens.ts`의 `tokens.color` | `Foundations/Tokens`, `WebSurface`, `DesktopSurface`, `Mobile Design Demo`    |
| radius 변경         | `tokens.radius`                                  | `Foundations/Tokens`, Mobile demo surface radius                              |
| spacing 변경        | `tokens.spacing`                                 | Storybook surface 간격, Mobile demo spacing                                   |
| button 상태 변경    | `tokens.component.button`                        | `Foundations/Tokens`, `UI/Button`, Mobile demo button contract                |
| chip 기본 표면 변경 | `tokens.component.chip`                          | `Foundations/Tokens`, Web/Desktop Chip CSS, `@nado/ui-native` Chip style      |
| review answer 변경  | `tokens.component.reviewCard.answer`             | `Foundations/Tokens`, Web/Desktop review card CSS, Mobile review answer style |

특정 플랫폼의 interaction만 바뀌는 경우에는 token 변경으로 밀어붙이지 않는다. 예를 들어 hover, focus, touch, drawer gesture 같은 동작은 플랫폼별 구현으로 다룬다.

## Mobile demo 실행

Mobile demo는 production 기본 탭에 노출하지 않는다. Expo public flag를 켠 경우에만 `디자인` 탭을 연다.

```bash
EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO=1 pnpm --filter @nado/mobile dev
```

확인할 화면:

1. Expo app을 연다.
2. 하단 tab에서 `디자인`을 선택한다.
3. `Primary color` 영역에서 color swatch와 `nativeTokens.color.primary`, `nativeTokens.color.surfaceMuted` source label을 함께 확인한다.
4. `Button contract` 영역에서 `@nado/ui/native` button sample과 `nativeTokens.component.button.primary`, `secondary`, `send`, `size.md`, `size.icon` source label을 함께 확인한다.

## 자동 검증

token parity 관련 변경은 최소한 아래 명령을 확인한다.

```bash
pnpm --filter @nado/tokens test
pnpm --filter @nado/ui test
pnpm --filter @nado/storybook test
pnpm --filter @nado/storybook typecheck
pnpm --filter @nado/storybook lint
pnpm --filter @nado/storybook build
pnpm --filter @nado/mobile test
git diff --check
```

검증이 보는 계약:

- `@nado/tokens` test는 CSS pixel token이 React Native number token으로 변환되는지 확인한다.
- `@nado/tokens` test는 token에서 생성되는 CSS custom property 이름이 Web/Desktop variable naming과 맞는지도 확인한다.
- `@nado/ui`와 `@nado/ui-web` test는 Web/Desktop CSS `:root`가 token 생성 output과 동기화되는지, Button과 Chip CSS가 component token 계약을 따르는지 확인한다.
- Storybook 구조 테스트는 `Foundations/Tokens`가 button, chip, reviewCard answer component token을 보여주는지 확인한다.
- Storybook build는 등록된 story가 production build에서 실제로 번들링되는지 확인한다.
- Mobile test는 `mobileStyles`가 `@nado/tokens/react-native`를 쓰는지, Mobile demo가 확인할 token source 목록을 화면과 같은 데이터로 제공하는지, 낮은 위험 데모 표면이 `@nado/ui/native` facade를 실제로 import하는지, review answer style이 `nativeTokens.component.reviewCard.answer`를 따르는지 확인한다.

## 관련 파일

| 역할                        | 파일                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| token 원본                  | `packages/tokens/src/tokens.ts`                                   |
| CSS variable generator      | `packages/tokens/src/cssCustomProperties.ts`                      |
| RN token adapter            | `packages/tokens/src/reactNative.ts`                              |
| Web/Desktop Button          | `packages/ui-web/src/Button.tsx`                                  |
| Web/Desktop Button/Chip CSS | `packages/ui-web/src/styles.css`                                  |
| Web/Desktop ReviewCard CSS  | `packages/ui-web/src/styles.css`                                  |
| Mobile primitive package    | `packages/ui-native/src/`                                         |
| Mobile facade package       | `packages/ui/src/native.ts`                                       |
| Storybook foundation demo   | `apps/storybook/src/Foundations.stories.tsx`                      |
| Mobile token demo           | `apps/mobile/src/features/design/MobileTokenParityDemoScreen.tsx` |
| Mobile shared styles        | `apps/mobile/src/styles/mobileStyles.ts`                          |

## 제외 범위

이 흐름은 현재 가능한 검증 표면을 연결하는 것이다. Storybook for React Native, Tamagui, NativeWind 같은 도구 도입 여부는 별도 issue에서 판단한다.
