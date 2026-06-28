# Cross-platform 디자인 시스템 공유 전략

## 목표

웹사이트 디자인이 바뀌었을 때 모바일 React Native 디자인도 같은 방향으로 따라가게 만드는 것이 목표다.

이 프로젝트에서는 모든 플랫폼이 같은 컴포넌트 파일을 직접 공유하는 방식보다 `Token-first + Platform-specific components` 방식이 더 현실적이다.

```txt
@nado/tokens
  디자인 값의 원본

@nado/ui
  Web / Desktop 호환 facade와 platform subpath

Mobile React Native UI
  @nado/tokens/react-native 기반으로 별도 구현

@nado/ui-native
  Mobile에서 반복되는 RN Button/Text/Stack/Card 최소 primitive
```

핵심은 웹 CSS를 모바일이 따라 하는 것이 아니라, 양쪽이 같은 token source를 바라보게 만드는 것이다.

## 현재 공유 구조

| 영역      | 현재 공유하는 것                                                                             | 별도 구현하는 것                                   | 현재 검증 위치         |
| --------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------- |
| Web       | `@nado/ui`, `@nado/ui/web`, `@nado/tokens`, `@nado/ui/styles.css`, `@nado/ui/web/styles.css` | Web app surface와 Next.js 연결                     | Web app, Storybook     |
| Desktop   | `@nado/ui`, `@nado/ui/web`, `@nado/tokens`, `@nado/ui/styles.css`, `@nado/ui/web/styles.css` | Desktop shell, Tauri 연결, desktop surface         | Desktop app, Storybook |
| Mobile    | `@nado/tokens/react-native`, `@nado/ui/native`, `@nado/ui-native`                            | React Native 화면, `StyleSheet`, touch interaction | Expo app, mobile tests |
| Storybook | Web/Desktop UI 상태 확인, mock surface                                                       | 실제 API/Auth/Supabase 연결                        | `apps/storybook`       |

Storybook은 디자인 시스템의 원본이 아니다. Storybook은 `@nado/ui`와 mock surface가 기대한 상태로 보이는지 확인하는 preview/verification layer다.

## v1 패키지 경계

v1에서는 패키지를 늘릴 때도 역할 경계를 작게 유지한다. `@nado/ui-web`과 `@nado/ui-native`는 구현 패키지이고, `@nado/core`는 이름만 먼저 예약한다.

| 패키지            | v1 역할                                     | 현재 상태        | 생성/확장 기준                                                      |
| ----------------- | ------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `@nado/tokens`    | primitive, semantic, component token의 원본 | 이미 사용 중     | 모든 플랫폼에 반영되어야 하는 디자인 값 변경                        |
| `@nado/ui`        | Web/Desktop 호환 facade와 platform subpath  | 이미 사용 중     | 기존 앱 import 유지와 명시 subpath 호환성                           |
| `@nado/ui-web`    | Web/Desktop React DOM 컴포넌트 구현         | 이미 사용 중     | DOM, CSS variable, Storybook 검증이 필요한 UI                       |
| `@nado/shared`    | 도메인 스키마, API 타입, 비즈니스 규칙      | 이미 사용 중     | 플랫폼과 무관한 제품 규칙이나 API 계약                              |
| `@nado/ui-native` | React Native 공통 primitive 구현            | 최소 도입됨      | `Button`, `Text`, `Stack`, `Card`, `Badge` contract와 RN token 검증 |
| `@nado/core`      | theme, hook, i18n, platform utility 후보    | 아직 만들지 않음 | 앱별 중복이 커지고 도메인 규칙과 분리할 필요가 생김                 |

`@nado/shared`와 `@nado/core`는 섞지 않는다. `@nado/shared`는 분석 요청/응답, 단어장 타입, 페이지네이션 같은 제품 도메인 계약을 맡고, `@nado/core`는 미래에 플랫폼 공통 runtime utility가 충분히 생겼을 때만 검토한다.

## Import 정책

Web과 Desktop은 React DOM 환경이므로 현재 기본 import는 `@nado/ui`를 사용한다.

```tsx
import { Button, InputComposer } from "@nado/ui";
import "@nado/ui/styles.css";
```

`@nado/ui/web`은 Web/Desktop 전용 public surface를 명시하기 위한 subpath다. 현재는 `@nado/ui`와 같은 DOM export를 re-export하며, 스타일도 `@nado/ui/web/styles.css`로 import할 수 있다. 기존 `@nado/ui`와 `@nado/ui/styles.css` import는 호환 경로로 유지하고, 앱 import migration은 선택 사항으로 둔다.

```tsx
import { Button, InputComposer } from "@nado/ui/web";
import "@nado/ui/web/styles.css";
```

Mobile v1은 `@nado/ui` root를 직접 import하지 않는다. React Native 화면은 `@nado/tokens/react-native`와 RN-local component/style 구현을 사용하고, 공통 primitive가 필요한 낮은 위험 표면부터 `@nado/ui/native` explicit subpath를 사용한다.

```tsx
import { nativeTokens } from "@nado/tokens/react-native";
import { Button, Stack, Text } from "@nado/ui/native";
```

현재 도입하지 않는 import 경로는 다음과 같다.

- `Button.web.tsx`
- `Button.native.tsx`

단일 `@nado/ui` root import를 web/native conditional export로 한 번에 제공하면 peer dependency, bundler condition, Storybook, Expo 해석 규칙이 한 번에 복잡해진다. 그래서 기본 root는 아직 cross-platform entry로 열지 않고, Web/Desktop은 `@nado/ui/web`, Mobile은 `@nado/ui/native`처럼 명시 subpath를 사용한다. 기준은 같은 파일 공유가 아니라 같은 token source와 같은 prop contract 공유다.

## 추천 원칙

### 1. 디자인 값은 token에서 시작한다

색상, 간격, radius, elevation 같은 값은 `@nado/tokens`를 원본으로 둔다.

현재 `@nado/tokens`는 Web에서 쓸 수 있는 CSS length 형태의 token을 제공하고, `@nado/tokens/react-native`는 React Native에서 쓰기 쉬운 number 형태의 `nativeTokens`를 제공한다.

예를 들어 `tokens.spacing.md`가 `"12px"`라면, `nativeTokens.spacing.md`는 `12`가 된다.

## v2 목표 패키지 구조

현재 `@nado/ui`는 Web/Desktop 호환 facade이고, 실제 React DOM 구현은 `@nado/ui-web`에 둔다. 장기적으로는 같은 facade 구조에서 Native 구현도 `@nado/ui-native`로 분리하는 구조를 목표로 한다.

```txt
packages/
  tokens/
  icons/
  core/
  ui/
  ui-web/
  ui-native/
```

`icons`와 `core`는 v2 목표 구조의 후보 패키지다. `ui-web`과 `ui-native`는 구현 패키지로 만들었고, 책임과 도입 기준은 [UI package facade migration](ui-package-facade-migration.md)을 기준으로 판단한다.

목표 import는 다음과 같다.

```tsx
// Web / Desktop
import { Button, Text, Stack } from "@nado/ui/web";
import "@nado/ui/web/styles.css";

// React Native
import { Button, Text, Stack } from "@nado/ui/native";
```

기본 `@nado/ui` import는 Next.js, Vite/Tauri, Expo/Metro가 모두 안전하게 해석되는지 검증한 뒤 마지막 단계에서만 cross-platform entry로 검토한다.

세부 migration 순서는 [UI package facade migration](ui-package-facade-migration.md)에 기록한다.

### 2. 컴포넌트 구현은 플랫폼별로 나눈다

Web/Desktop은 DOM과 CSS를 사용하므로 `@nado/ui` 컴포넌트를 공유할 수 있다.

Mobile은 React Native라 DOM className, CSS variable, hover 같은 개념을 그대로 사용할 수 없다. 그래서 Mobile은 RN 전용 컴포넌트와 `StyleSheet`를 유지한다.

대신 컴포넌트 이름과 사용 규칙은 맞춘다.

| 공통 규칙 | Web/Desktop 예                  | Mobile 예                            |
| --------- | ------------------------------- | ------------------------------------ |
| 역할      | Button                          | NativeButton 후보                    |
| variant   | `primary`, `secondary`, `ghost` | `primary`, `secondary`, `ghost`      |
| size      | `sm`, `md`, `icon`              | `sm`, `md`, `icon`                   |
| state     | `idle`, `disabled`, `loading`   | `idle`, `disabled`, `loading`        |
| source    | `@nado/ui`, `@nado/ui/web`      | `@nado/ui/native`, `@nado/ui-native` |

현재 Button의 실제 계약은 `variant: primary | secondary | ghost | send`, `size: sm | md | icon`이다. `lg`는 token과 양쪽 구현이 함께 준비된 뒤 추가할 확장 후보로 둔다. 이렇게 하면 파일은 달라도 제품에서 말하는 버튼의 의미는 같아진다.

### 3. 웹 디자인 변경은 token 변경으로 표현한다

웹 화면만 보고 CSS 값을 직접 바꾸는 흐름은 모바일 반영이 늦어진다.

반대로 디자인 변경을 token 변경으로 표현하면 Web/Desktop/Mobile이 같은 원본을 공유할 수 있다.

권장 흐름:

1. 디자인 변경 요구를 token 변경인지, 컴포넌트 구조 변경인지 구분한다.
2. 색상, 간격, radius, elevation 변경이면 `@nado/tokens`를 먼저 수정한다.
3. Web/Desktop의 `@nado/ui`가 token을 사용하고 있는지 확인한다.
4. Mobile의 `mobileStyles` 또는 `@nado/ui-native`가 `nativeTokens`를 사용하고 있는지 확인한다.
5. Storybook에서 Web/Desktop 상태를 확인한다.
6. 현재는 Expo app과 mobile tests에서 Mobile 상태를 확인한다.
7. Storybook for React Native를 도입한 뒤에는 RN 컴포넌트 상태를 story로 고정한다.

## Token layer 제안

현재 token은 color, radius, shadow, spacing 중심이다. 앞으로 플랫폼 간 디자인 변경을 더 안정적으로 전달하려면 token을 세 단계로 나누는 것이 좋다.

| 단계            | 의미                  | 예시                                                        | 사용처                          |
| --------------- | --------------------- | ----------------------------------------------------------- | ------------------------------- |
| Primitive token | 가장 원시적인 제품 값 | `color.blue`, `spacing.md`, `radius.md`                     | 직접 사용은 최소화              |
| Semantic token  | 제품 의미를 가진 값   | `color.primary`, `color.surface`, `color.inkMuted`          | 대부분의 컴포넌트               |
| Component token | 특정 컴포넌트 상태 값 | `button.primary.background`, `reviewCard.answer.background` | Web/RN parity가 중요한 컴포넌트 |

현재 프로젝트에서는 primitive와 semantic이 섞여 있고, component token은 `button`과 `reviewCard.answer`부터 시작한다. 당장 큰 마이그레이션을 하기보다, 새 UI나 parity가 중요한 UI부터 component token을 넓히는 방식이 안전하다.

## Package 역할

### `@nado/tokens`

디자인 값의 단일 원본이다.

현재 역할:

- 공통 color, radius, spacing, shadow token 제공
- Button component token 제공
- ReviewCard answer surface component token 제공
- React Native용 `nativeTokens` adapter 제공
- Web length token과 RN number token의 차이를 흡수
- Component token 안의 CSS pixel 값도 React Native에서는 number로 변환

다음 개선 후보:

- CSS custom property output을 token에서 생성
- chip과 ReviewCard의 다른 state로 component token 확대
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

### `@nado/ui-native`

Mobile에서 반복되는 RN 컴포넌트를 `@nado/ui-native` 패키지로 분리한다.

도입 기준:

- Mobile 화면에서 같은 UI 패턴이 2곳 이상 반복된다.
- Web/Desktop의 `@nado/ui`와 같은 variant/state 계약을 맞춰야 한다.
- 단순 screen-local style보다 패키지화했을 때 유지보수 비용이 줄어든다.

처음부터 큰 패키지를 만들기보다 공통 API 계약이 이미 있는 `Button`, `Text`, `Stack`, `Card`, `Badge`처럼 반복이 확인된 primitive부터 순차적으로 확장하는 것이 좋다. `Chip`과 `ReviewCard`의 추가 state는 component token 반복이 확인될 때 별도 후보로 다룬다.

[RN component repeat audit](rn-component-repeat-audit.md)에서 `Button`, `Text`, `Stack` 반복은 확인되었고, [Mobile Card repeat audit](mobile-card-repeat-audit.md)에서 Card 후보도 확인되었다. [Mobile Badge/Chip 반복 점검과 경계](mobile-badge-chip-repeat-audit.md)에서는 `vocabularyType`을 Badge 후보로 분리했다. `@nado/ui-native`는 이 primitive의 최소 API를 제공하고, `@nado/ui/native`는 이 패키지를 re-export한다. 앱 전체 마이그레이션은 포함하지 않고, 적용은 token parity demo나 작은 실제 화면 표면부터 시작한다.

### `@nado/shared`

플랫폼과 무관한 제품 도메인 계약을 담는다.

현재 역할:

- 분석 요청/응답 스키마
- 단어장 타입과 저장 요청 스키마
- 페이지네이션, realtime refresh, 입력 검증 같은 제품 규칙

주의할 점:

- 디자인 token이나 UI component prop을 `@nado/shared`로 옮기지 않는다.
- 플랫폼 runtime hook, theme provider, i18n helper는 중복이 충분히 커지기 전까지 앱별 구현 또는 후보 문서로 둔다.

### 향후 `@nado/core`

`@nado/core`는 v1에서 만들지 않는다. 후보 역할은 theme, platform hook, i18n, storage abstraction, platform utility다.

도입 기준:

- Web/Desktop/Mobile에서 같은 runtime utility가 반복된다.
- 해당 utility가 도메인 스키마가 아니라 앱 실행 지원 성격이다.
- `@nado/shared`에 넣으면 도메인 계약과 runtime helper가 섞인다.

즉, `@nado/core`는 "있으면 좋아 보이는 공통 폴더"가 아니라 실제 중복과 책임 분리가 생긴 뒤 만든다.

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

도구별 판단 기준은 다음처럼 나눈다.

| 후보                         | 현재 사용 가능 여부                                   | 확인 범위                                      | 우선순위와 한계                                                                                                 |
| ---------------------------- | ----------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Expo 기반 Mobile Design Demo | 사용 가능. `@nado/mobile`의 Expo app에서 확인한다.    | 실제 RN 화면, token 반영, touch 상태           | 지금 바로 쓸 수 있는 1순위 경로다. 단, demo screen을 만들기 전에는 기존 화면에서 수동 확인해야 한다.            |
| Storybook for React Native   | 미설치. 현재 repo의 Storybook은 React Vite 기반이다.  | RN 공통 컴포넌트의 variant/state catalog       | 현재 검증 표면이 아니라 후속 도입 후보다. `@nado/ui-native`나 RN 공통 컴포넌트가 생긴 뒤 도입 효과가 커진다.    |
| React Native Testing Library | 미설치. 현재 mobile tests는 Vitest 중심이다.          | RN 컴포넌트 렌더링, accessibility, press state | 시각 preview 도구가 아니라 컴포넌트 동작 회귀 방지 도구다. 공통 RN 컴포넌트 API가 생긴 뒤 테스트 기준으로 둔다. |
| Maestro 또는 E2E             | 미설치. 현재 E2E는 Web Playwright 앱으로 분리돼 있다. | 실제 앱 실행 흐름, navigation, touch flow      | 디자인 token 자체보다 사용자 흐름 검증에 맞다. 주요 모바일 플로우가 안정화된 뒤 smoke 수준부터 도입을 검토한다. |

추천 순서:

1. `@nado/tokens` 변경으로 디자인 값을 공유한다.
2. Mobile RN 컴포넌트가 `nativeTokens`를 사용하도록 만든다.
3. 현재는 Expo app과 mobile tests로 변경 결과를 확인한다.
4. RN 공통 컴포넌트가 생기면 React Native Testing Library로 state와 accessibility 계약을 먼저 고정한다.
5. Storybook for React Native를 도입한 뒤에는 story로 주요 RN 컴포넌트 상태를 고정한다.
6. 앱 단위 회귀가 필요해지면 Maestro 또는 RN E2E로 핵심 touch flow를 smoke test로 확인한다.

즉, 지금 당장 후속 모바일 디자인 변경자가 실행할 수 있는 경로는 Expo app과 mobile tests다. Storybook for RN은 준비된 경로가 아니라 다음 도입 후보로 문서화한다.

## Token parity demo

token 변경이 Web/Desktop/Mobile에 함께 보이는지 확인하는 현재 기준 흐름은 [Token parity demo 검증 흐름](token-parity-demo.md)을 따른다.

현재 사용 가능한 확인 표면은 다음이다.

- Storybook `Foundations/Tokens`, `UI/Button`, `WebSurface`, `DesktopSurface`
- Expo app `Mobile Design Demo`
- `packages/tokens`, `@nado/ui`, `@nado/storybook`, `@nado/mobile` test

추가 demo는 token 또는 component contract가 새로 확장될 때만 별도 issue로 만든다.

## 후속 작업 후보

이 문서는 전략 정리까지만 다룬다. 실제 구현은 다음 issue로 나눈다.

- `@nado/tokens` component token을 chip과 ReviewCard의 추가 state로 확대
- `@nado/ui/styles.css`와 `@nado/ui/web/styles.css`의 CSS custom property를 token에서 생성할 수 있는지 검토
- `@nado/ui/native` facade를 사용하는 Mobile 적용 표면 확대 기준 검토
- Mobile `mobileStyles`에서 `@nado/ui-native`로 옮길 낮은 위험 적용 표면 선정
- Mobile `reviewCard`와 `vocabularyItem` 추가 적용 여부 판단
- `@nado/core` 도입 기준과 첫 후보 utility 검토
- Storybook for React Native 도입 방식 검토
- Mobile token parity story 추가

## v1 제외 범위와 future capability

다음 기능은 크로스플랫폼 요구가 있지만, v1 런타임 구현 범위에는 넣지 않는다.

| 기능            | v1 판단                       | 이유                                                                      |
| --------------- | ----------------------------- | ------------------------------------------------------------------------- |
| 파일 업로드     | future platform adapter 후보  | Web/Desktop의 file input/Tauri API와 Mobile picker 계열이 다르다.         |
| Tooltip         | future platform-specific 후보 | Web hover/focus와 Mobile touch/popover 또는 sheet interaction이 다르다.   |
| Toast           | future message contract 후보  | 메시지 타입은 공유할 수 있지만 renderer와 안전 영역 처리는 플랫폼별이다.  |
| 공통 API client | future `@nado/core` 후보      | 현재는 `@nado/shared` 도메인 계약을 우선하고 앱별 client 중복을 관찰한다. |

이 항목들은 "공통 컴포넌트로 바로 뽑기"보다 먼저 platform adapter의 입력/출력 계약을 정해야 한다. 후속 issue에서는 공통 메시지 타입, 권한/파일 선택 흐름, 접근성 기준, 실패 상태를 별도로 다룬다.

## 참고 링크

- [Storybook for React Native](https://github.com/storybookjs/react-native)
- [Storybook React Native Web 문서](https://storybook.js.org/docs/get-started/frameworks/react-native-web-vite)

## 정리

이 프로젝트에서 가장 좋은 출발점은 공통 컴포넌트 하나를 모든 플랫폼에 강제로 쓰는 것이 아니다.

먼저 `@nado/tokens`를 디자인 변경의 원본으로 만들고, Web/Desktop은 `@nado/ui`, Mobile은 RN 전용 구현이 같은 token과 같은 컴포넌트 계약을 따르게 해야 한다.

이 구조가 자리 잡으면 웹사이트 디자인 변경은 CSS 수정 하나로 끝나지 않고, Mobile에서도 같은 token 변경을 통해 따라갈 수 있다.
