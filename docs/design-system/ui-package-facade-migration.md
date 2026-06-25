# UI package facade migration

이 문서는 Nado 디자인 시스템을 `@nado/ui` facade와 platform implementation package로 확장하는 목표 구조를 정의한다.

현재 v1 구조는 Web/Desktop이 `@nado/ui` React DOM 구현을 직접 사용하고, Mobile은 `@nado/tokens/react-native`와 RN-local 구현을 사용한다. 이 구조는 안정적이지만, 장기적으로 Web/Desktop/RN이 같은 component API를 더 명확히 공유하려면 public import facade와 실제 구현 패키지를 분리해야 한다.

## 목표 구조

장기 목표는 다음 구조다.

```txt
apps/
  web/
  desktop/
  mobile/

packages/
  tokens/
  icons/
  core/
  ui/
  ui-web/
  ui-native/
```

각 패키지의 책임은 다음처럼 나눈다.

| Package           | 역할                                                     | 도입 기준                             |
| ----------------- | -------------------------------------------------------- | ------------------------------------- |
| `@nado/tokens`    | color, spacing, typography, radius, component token 원본 | 이미 사용 중                          |
| `@nado/icons`     | 공통 icon asset 또는 wrapper 후보                        | 같은 아이콘 asset 관리가 반복될 때    |
| `@nado/core`      | theme, hooks, i18n, storage, platform utility 후보       | 앱별 runtime utility 중복이 확인될 때 |
| `@nado/ui`        | public facade와 공통 type/prop contract                  | `ui-web`, `ui-native`가 생긴 뒤 전환  |
| `@nado/ui-web`    | React DOM/Web/Desktop 구현                               | 현재 `@nado/ui` DOM 구현을 옮길 때    |
| `@nado/ui-native` | React Native 구현                                        | RN 공통 컴포넌트가 2곳 이상 반복될 때 |

`@nado/shared`는 이 구조에 포함하지 않는다. `@nado/shared`는 분석 요청/응답, 단어장 타입, 저장 요청 같은 제품 도메인 계약을 담당한다.

## 권장 접근

선택지는 세 가지다.

| 접근                                                | 장점                                           | 단점                                                          | 판단      |
| --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | --------- |
| 현재 구조 유지                                      | 가장 단순하고 안정적                           | 사용자가 원하는 `@nado/ui/web`, `@nado/ui/native` 경계가 없음 | 단기 유지 |
| `@nado/ui` facade + `ui-web`/`ui-native` 패키지     | public API와 구현 책임이 분리됨                | package export와 build 설정을 단계적으로 바꿔야 함            | 채택      |
| 한 패키지 안의 `Button.web.tsx`/`Button.native.tsx` | 파일명이 직관적이고 React Native 관례와 가까움 | Next, Vite, Tauri, Metro의 resolver 차이를 동시에 관리해야 함 | 보류      |

Nado에서는 두 번째 접근을 채택한다. `Button.web.tsx`와 `Button.native.tsx`는 최상위 패키지 전략으로 사용하지 않는다. 필요하면 각 구현 패키지 내부 파일명으로만 제한적으로 쓸 수 있다.

## Public import 목표

최종 사용 형태는 다음을 목표로 한다.

```tsx
// Web / Desktop
import { Button, Stack, Text } from "@nado/ui/web";

// React Native
import { Button, Stack, Text } from "@nado/ui/native";
```

기본 export는 마지막 단계에서만 연다.

```tsx
import { Button, Stack, Text } from "@nado/ui";
```

기본 `@nado/ui` export는 Next.js, Vite/Tauri, Expo/Metro가 모두 같은 의도로 해석하는지 검증되기 전까지 cross-platform import로 홍보하지 않는다. 그 전에는 명시적인 `@nado/ui/web`, `@nado/ui/native` subpath를 표준으로 둔다.

## Component API 범위

facade가 보장해야 하는 공통 API 대상은 다음 여섯 가지다.

| Component | 공통 API 상태  | Web 구현  | Native 구현 |
| --------- | -------------- | --------- | ----------- |
| `Button`  | 현재 계약 있음 | 구현됨    | 향후 구현   |
| `Text`    | 현재 계약 있음 | 구현됨    | 향후 구현   |
| `Stack`   | 현재 계약 있음 | 구현됨    | 향후 구현   |
| `Card`    | 목표 계약 있음 | 향후 구현 | 향후 구현   |
| `Badge`   | 목표 계약 있음 | 향후 구현 | 향후 구현   |
| `Avatar`  | 목표 계약 있음 | 향후 구현 | 향후 구현   |

공통 API는 prop 이름과 제품 의미를 공유한다. DOM element, CSS class, `Pressable`, `View`, `StyleSheet` 같은 구현 방식은 공유하지 않는다.

예상 API 예시는 다음과 같다.

```tsx
<Button variant="primary" size="md">
  Save
</Button>
<Text tone="muted" />
<Stack gap="md" />
<Card padding="lg" />
```

`lg` button size는 아직 현재 Button 계약에 포함하지 않는다. `tokens.component.button.size.lg`, Web 구현, Native 구현이 함께 준비된 뒤 추가한다.

## Migration plan

### Phase 0. 현재 상태 유지

현재 상태는 다음과 같다.

- `@nado/ui`는 React DOM 구현 패키지다.
- Web/Desktop은 `@nado/ui`와 `@nado/ui/styles.css`를 사용한다.
- Mobile은 `@nado/ui`를 import하지 않는다.
- Mobile은 `@nado/tokens/react-native`와 RN-local 구현을 사용한다.

이 단계는 이미 완료되어 있다.

### Phase 1. facade 설계 고정

이 문서와 [Component API contracts](component-api-contracts.md)에 목표 import와 패키지 책임을 기록한다.

이 단계에서는 패키지를 만들지 않는다. 목표는 migration 순서와 제외 범위를 명확히 하는 것이다.

### Phase 2. `@nado/ui/web` subpath 추가

가장 작은 런타임 변경은 현재 `@nado/ui` DOM 구현을 유지한 채 `@nado/ui/web` subpath를 추가하는 것이다.

예상 구조:

```txt
packages/ui/
  src/
    index.ts
    web.ts
```

예상 export:

```json
{
  ".": {
    "types": "./src/index.ts",
    "development": "./src/index.ts",
    "import": "./dist/index.js"
  },
  "./web": {
    "types": "./src/web.ts",
    "development": "./src/web.ts",
    "import": "./dist/web.js"
  },
  "./styles.css": {
    "development": "./src/styles.css",
    "import": "./dist/styles.css"
  }
}
```

이 단계에서는 `@nado/ui/native`를 아직 열지 않는다. Web/Desktop import migration도 선택 사항으로 둔다.

### Phase 3. `@nado/ui-web` 생성과 DOM 구현 이동

`@nado/ui-web` 패키지를 만들고 현재 DOM 구현을 옮긴다. `@nado/ui/web`은 `@nado/ui-web`을 re-export한다.

예상 구조:

```txt
packages/ui/
  src/
    index.ts
    web.ts

packages/ui-web/
  src/
    Button.tsx
    TextPrimitive.tsx
    Stack.tsx
    styles.css
```

이 단계의 완료 조건:

- Web/Desktop 앱은 계속 동작한다.
- Storybook은 `@nado/ui/web` 또는 `@nado/ui-web` 중 하나의 기준으로 정리된다.
- 기존 `@nado/ui` import는 deprecation 기간 동안 유지한다.

### Phase 4. `@nado/ui-native` 최소 패키지 생성

RN-local 구현에서 반복이 확인된 뒤 `@nado/ui-native`를 만든다. 첫 후보는 `Button`, `Text`, `Stack`이다.

도입 기준:

- 같은 RN UI 패턴이 2곳 이상 반복된다.
- `@nado/tokens/react-native`를 기준으로 구현할 수 있다.
- `@nado/ui-web`과 같은 prop contract를 지킬 수 있다.
- `@nado/mobile` test 또는 React Native Testing Library로 회귀를 잡을 수 있다.

이 단계가 되면 `@nado/ui/native`는 `@nado/ui-native`를 re-export한다.

### Phase 5. 기본 `@nado/ui` conditional export 검토

마지막 단계에서만 기본 import를 검토한다.

```tsx
import { Button } from "@nado/ui";
```

이 단계의 선행 조건:

- Next.js web build가 `@nado/ui`를 web 구현으로 해석한다.
- Tauri/Vite desktop build가 `@nado/ui`를 web 구현으로 해석한다.
- Expo/Metro가 `@nado/ui`를 native 구현으로 해석한다.
- typecheck와 editor type resolution이 platform별로 깨지지 않는다.
- CI에서 Web/Desktop/Mobile 검증이 모두 통과한다.

조건부 export가 불안정하면 기본 `@nado/ui`를 cross-platform entry로 열지 않고, 명시적 subpath만 표준으로 유지한다.

## 다음 PR 후보

이 설계 뒤의 구현은 아래처럼 나눈다.

1. `@nado/ui/web` subpath 추가
   - 현재 구현을 이동하지 않고 `web.ts` re-export만 추가한다.
   - Web/Desktop/Storybook import 정책을 문서와 테스트로 확인한다.

2. `@nado/ui` styles export 정리
   - `@nado/ui/styles.css`와 향후 `@nado/ui/web/styles.css` 또는 `@nado/ui-web/styles.css` 중 표준을 정한다.
   - token 기반 CSS custom property 생성 후보와 연결한다.

3. `@nado/ui-web` 패키지 생성
   - 현재 DOM 구현을 이동한다.
   - `@nado/ui/web` facade가 `@nado/ui-web`을 바라보게 한다.

4. RN-local Button/Text/Stack 반복 점검
   - 실제 mobile 화면에서 공통화할 반복 UI가 있는지 확인한다.
   - 반복이 충분하면 `@nado/ui-native` 생성 티켓을 만든다.

5. `@nado/ui-native` 최소 API 구현
   - `Button`, `Text`, `Stack`부터 시작한다.
   - `Card`, `Badge`, `Avatar`는 그 다음 후보로 둔다.

## 제외 범위

이 설계는 패키지 구조의 방향을 정하기 위한 것이다. 다음은 별도 티켓으로 분리한다.

- `packages/ui-web` 실제 생성
- `packages/ui-native` 실제 생성
- `packages/core` 실제 생성
- 기존 앱 import migration
- RN 공통 컴포넌트 구현
- Card, Badge, Avatar 구현
- Storybook for React Native 도입

## 검증 기준

문서 단계에서는 다음을 확인한다.

- `pnpm prettier --check docs/design-system/*.md`
- `git diff --check`

구현 단계부터는 변경 범위에 따라 다음을 추가한다.

- `pnpm --filter @nado/ui test`
- `pnpm --filter @nado/ui typecheck`
- `pnpm --filter @nado/storybook test`
- `pnpm --filter @nado/storybook build`
- `pnpm --filter @nado/mobile test`
- `pnpm --filter @nado/mobile typecheck`

## 결정 요약

Nado의 목표 구조는 `@nado/ui` facade와 `@nado/ui-web`, `@nado/ui-native` 구현 패키지 분리다.

다만 실제 이동은 단계적으로 한다. 가장 먼저 `@nado/ui/web` subpath를 열고, 그 다음 DOM 구현을 `@nado/ui-web`으로 이동한다. `@nado/ui/native`와 `@nado/ui-native`는 RN 반복 컴포넌트가 확인된 뒤 만든다.
