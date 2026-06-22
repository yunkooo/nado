# Cross-platform 디자인 시스템 공유 전략

## 목표

웹사이트 디자인이 바뀌었을 때 모바일 React Native 디자인도 같은 방향으로 따라가게 만드는 것이 목표다.

이 프로젝트에서는 모든 플랫폼이 같은 컴포넌트 파일을 직접 공유하는 방식보다 `Token-first + Platform-specific components` 방식이 더 현실적이다.

```txt
@nado/tokens
  디자인 값의 원본

@nado/ui
  Web / Desktop React DOM 컴포넌트

Mobile React Native UI
  @nado/tokens/react-native 기반으로 별도 구현

향후 @nado/ui-native 후보
  Mobile에서 반복되는 RN 컴포넌트를 패키지화
```

핵심은 웹 CSS를 모바일이 따라 하는 것이 아니라, 양쪽이 같은 token source를 바라보게 만드는 것이다.

## 현재 공유 구조

| 영역      | 현재 공유하는 것                                  | 별도 구현하는 것                                   | 현재 검증 위치         |
| --------- | ------------------------------------------------- | -------------------------------------------------- | ---------------------- |
| Web       | `@nado/ui`, `@nado/tokens`, `@nado/ui/styles.css` | Web app surface와 Next.js 연결                     | Web app, Storybook     |
| Desktop   | `@nado/ui`, `@nado/tokens`, `@nado/ui/styles.css` | Desktop shell, Tauri 연결, desktop surface         | Desktop app, Storybook |
| Mobile    | `@nado/tokens/react-native`                       | React Native 화면, `StyleSheet`, touch interaction | Expo app, mobile tests |
| Storybook | Web/Desktop UI 상태 확인, mock surface            | 실제 API/Auth/Supabase 연결                        | `apps/storybook`       |

Storybook은 디자인 시스템의 원본이 아니다. Storybook은 `@nado/ui`와 mock surface가 기대한 상태로 보이는지 확인하는 preview/verification layer다.

## 추천 원칙

### 1. 디자인 값은 token에서 시작한다

색상, 간격, radius, elevation 같은 값은 `@nado/tokens`를 원본으로 둔다.

현재 `@nado/tokens`는 Web에서 쓸 수 있는 CSS length 형태의 token을 제공하고, `@nado/tokens/react-native`는 React Native에서 쓰기 쉬운 number 형태의 `nativeTokens`를 제공한다.

예를 들어 `tokens.spacing.md`가 `"12px"`라면, `nativeTokens.spacing.md`는 `12`가 된다.

### 2. 컴포넌트 구현은 플랫폼별로 나눈다

Web/Desktop은 DOM과 CSS를 사용하므로 `@nado/ui` 컴포넌트를 공유할 수 있다.

Mobile은 React Native라 DOM className, CSS variable, hover 같은 개념을 그대로 사용할 수 없다. 그래서 Mobile은 RN 전용 컴포넌트와 `StyleSheet`를 유지한다.

대신 컴포넌트 이름과 사용 규칙은 맞춘다.

| 공통 규칙 | Web/Desktop 예                  | Mobile 예                       |
| --------- | ------------------------------- | ------------------------------- |
| 역할      | Button                          | NativeButton 후보               |
| variant   | `primary`, `secondary`, `ghost` | `primary`, `secondary`, `ghost` |
| size      | `sm`, `md`, `lg`                | `sm`, `md`, `lg`                |
| state     | `idle`, `disabled`, `loading`   | `idle`, `disabled`, `loading`   |
| source    | `@nado/ui`                      | 향후 `@nado/ui-native` 후보     |

이렇게 하면 파일은 달라도 제품에서 말하는 버튼의 의미는 같아진다.

### 3. 웹 디자인 변경은 token 변경으로 표현한다

웹 화면만 보고 CSS 값을 직접 바꾸는 흐름은 모바일 반영이 늦어진다.

반대로 디자인 변경을 token 변경으로 표현하면 Web/Desktop/Mobile이 같은 원본을 공유할 수 있다.

권장 흐름:

1. 디자인 변경 요구를 token 변경인지, 컴포넌트 구조 변경인지 구분한다.
2. 색상, 간격, radius, elevation 변경이면 `@nado/tokens`를 먼저 수정한다.
3. Web/Desktop의 `@nado/ui`가 token을 사용하고 있는지 확인한다.
4. Mobile의 `mobileStyles` 또는 향후 `@nado/ui-native`가 `nativeTokens`를 사용하고 있는지 확인한다.
5. Storybook에서 Web/Desktop 상태를 확인한다.
6. 현재는 Expo app과 mobile tests에서 Mobile 상태를 확인한다.
7. Storybook for React Native를 도입한 뒤에는 RN 컴포넌트 상태를 story로 고정한다.

## Token layer 제안

현재 token은 color, radius, shadow, spacing 중심이다. 앞으로 플랫폼 간 디자인 변경을 더 안정적으로 전달하려면 token을 세 단계로 나누는 것이 좋다.

| 단계            | 의미                  | 예시                                                              | 사용처                          |
| --------------- | --------------------- | ----------------------------------------------------------------- | ------------------------------- |
| Primitive token | 가장 원시적인 제품 값 | `color.blue`, `spacing.md`, `radius.md`                           | 직접 사용은 최소화              |
| Semantic token  | 제품 의미를 가진 값   | `color.primary`, `color.surface`, `color.inkMuted`                | 대부분의 컴포넌트               |
| Component token | 특정 컴포넌트 상태 값 | `button.primary.background`, `reviewCard.answer.hiddenBackground` | Web/RN parity가 중요한 컴포넌트 |

현재 프로젝트에서는 primitive와 semantic이 섞여 있고, component token은 `button`부터 시작한다. 당장 큰 마이그레이션을 하기보다, 새 UI나 parity가 중요한 UI부터 component token을 넓히는 방식이 안전하다.

## Package 역할

### `@nado/tokens`

디자인 값의 단일 원본이다.

현재 역할:

- 공통 color, radius, spacing, shadow token 제공
- Button component token 제공
- React Native용 `nativeTokens` adapter 제공
- Web length token과 RN number token의 차이를 흡수
- Component token 안의 CSS pixel 값도 React Native에서는 number로 변환

다음 개선 후보:

- CSS custom property output을 token에서 생성
- chip, reviewCard 같은 component token 확대
- token 변경 시 Web/Desktop/Mobile demo에서 같은 변경이 보이는지 확인하는 테스트 추가

### `@nado/ui`

Web/Desktop의 React DOM 컴포넌트 패키지다.

현재 역할:

- 분석 결과, 단어 토큰, 단어장, 복습 카드, chip, input composer 같은 UI 제공
- Storybook에서 co-located story로 주요 상태 확인
- `@nado/tokens`를 dependency로 가진다

주의할 점:

- `@nado/ui`는 React Native에서 그대로 사용할 수 없다.
- Web CSS class와 CSS variable은 Mobile의 `StyleSheet`로 자동 변환되지 않는다.
- Web/Desktop 컴포넌트 변경 시 Mobile도 같은 token과 사용 규칙을 따르는지 별도 확인이 필요하다.

### 향후 `@nado/ui-native`

Mobile에서 반복되는 RN 컴포넌트가 늘어나면 `@nado/ui-native` 패키지를 검토한다.

도입 기준:

- Mobile 화면에서 같은 UI 패턴이 2곳 이상 반복된다.
- Web/Desktop의 `@nado/ui`와 같은 variant/state 계약을 맞춰야 한다.
- 단순 screen-local style보다 패키지화했을 때 유지보수 비용이 줄어든다.

처음부터 큰 패키지를 만들기보다 `Button`, `Chip`, `ReviewCard`처럼 작은 컴포넌트부터 시작하는 것이 좋다.

## Web 변경이 Mobile까지 따라가는 기준

웹 디자인 변경이 생겼을 때 아래 질문에 답한다.

| 질문                                   | 예                                  | 처리 기준                                  |
| -------------------------------------- | ----------------------------------- | ------------------------------------------ |
| 색상/간격/radius 변경인가?             | primary color, card radius          | token 변경을 우선한다                      |
| 특정 컴포넌트 상태 변경인가?           | saved chip 색상, hidden answer 배경 | component token 후보로 본다                |
| DOM 구조나 hover 전용 interaction인가? | popover hover, sidebar hover        | Mobile에서는 touch 대체 UI를 별도 설계한다 |
| 제품 정책 변경인가?                    | 저장 상태 이름, error copy          | shared type 또는 문서 기준을 먼저 확인한다 |

즉, 값은 공유하고 interaction은 플랫폼에 맞게 바꾼다.

## 검증 전략

### Web/Desktop

Storybook을 기본 검증 표면으로 사용한다.

확인 대상:

- 주요 컴포넌트 state
- Web surface
- Desktop surface
- narrow viewport
- mock 기반 에러/빈 상태

현재 기본 검증:

- `pnpm --filter @nado/storybook test`
- `pnpm --filter @nado/storybook typecheck`
- `pnpm --filter @nado/storybook build`

### Mobile

현재 Mobile에서 실제로 사용할 수 있는 검증 표면은 Expo app과 mobile tests다.

Storybook for React Native는 아직 이 저장소에 설정되어 있지 않으므로 현재 검증 위치처럼 취급하지 않는다. 다만 RN 공통 컴포넌트가 늘어나면 가장 먼저 검토할 Mobile component catalog 후보로 둔다.

도입하더라도 Storybook for RN은 디자인 값의 원본이 아니다. 디자인 값의 원본은 계속 `@nado/tokens`이고, Storybook for RN은 RN 컴포넌트가 그 token과 state 규칙을 잘 따르는지 확인하는 공간이다.

| 도구                         | 현재 상태 | 역할                                   | 도입 기준                                           |
| ---------------------------- | --------- | -------------------------------------- | --------------------------------------------------- |
| Expo app                     | 사용 가능 | 실제 앱 안에서 RN 디자인을 빠르게 확인 | 현재 Mobile 화면 확인                               |
| Mobile tests                 | 사용 가능 | token adapter와 mobile style 계약 확인 | 현재 회귀 확인                                      |
| Storybook for React Native   | 후속 후보 | RN 컴포넌트 catalog와 state 확인       | Mobile 공통 컴포넌트를 만들기 시작할 때             |
| React Native Testing Library | 후속 후보 | 컴포넌트 state와 accessibility 확인    | RN 공통 컴포넌트가 생길 때                          |
| Maestro                      | 후속 후보 | 실제 앱 흐름과 터치 interaction 확인   | onboarding, analysis, vocabulary flow가 안정화될 때 |

추천 순서:

1. `@nado/tokens` 변경으로 디자인 값을 공유한다.
2. Mobile RN 컴포넌트가 `nativeTokens`를 사용하도록 만든다.
3. 현재는 Expo app과 mobile tests로 변경 결과를 확인한다.
4. Storybook for React Native를 도입한 뒤에는 story로 주요 RN 컴포넌트 상태를 고정한다.

즉, 지금 당장 후속 모바일 디자인 변경자가 실행할 수 있는 경로는 Expo app과 mobile tests다. Storybook for RN은 준비된 경로가 아니라 다음 도입 후보로 문서화한다.

## Demo 후보

첫 demo는 token 변경이 세 플랫폼에 반영되는지 보여주는 작은 화면이면 충분하다.

후보:

1. `primary` color 변경 demo
2. `radius.md` 변경 demo
3. `spacing.md` 변경 demo
4. Button/Chip state parity demo
5. ReviewCard answer hidden/revealed parity demo

완성 기준:

- Web Storybook에서 변경이 보인다.
- Desktop Storybook surface에서 변경이 보인다.
- 현재는 Expo app 또는 mobile tests에서 같은 token 변경이 확인된다.
- Storybook for RN 도입 후에는 Mobile story에서도 같은 token 변경이 보인다.
- 각 플랫폼에서 구현은 달라도 variant/state 이름은 동일하다.

## 후속 작업 후보

이 문서는 전략 정리까지만 다룬다. 실제 구현은 다음 issue로 나눈다.

- `@nado/tokens` component token을 chip, reviewCard로 확대
- `@nado/ui/styles.css`의 CSS custom property를 token에서 생성할 수 있는지 검토
- Mobile `mobileStyles`가 주요 반복 UI에서 `nativeTokens`를 계속 사용하는지 점검
- `@nado/ui-native` 최소 API 설계
- Storybook for React Native 도입 방식 검토
- Mobile token parity story 추가
- 필요한 경우 Mobile token parity demo screen 추가
- token 변경이 Web/Desktop/Mobile에 반영되는 demo 구성
- RN 검증 도구 비교와 도입 기준 정리

## 참고 링크

- [Storybook for React Native](https://github.com/storybookjs/react-native)
- [Storybook React Native Web 문서](https://storybook.js.org/docs/get-started/frameworks/react-native-web-vite)

## 정리

이 프로젝트에서 가장 좋은 출발점은 공통 컴포넌트 하나를 모든 플랫폼에 강제로 쓰는 것이 아니다.

먼저 `@nado/tokens`를 디자인 변경의 원본으로 만들고, Web/Desktop은 `@nado/ui`, Mobile은 RN 전용 구현이 같은 token과 같은 컴포넌트 계약을 따르게 해야 한다.

이 구조가 자리 잡으면 웹사이트 디자인 변경은 CSS 수정 하나로 끝나지 않고, Mobile에서도 같은 token 변경을 통해 따라갈 수 있다.
