# Component API contracts

이 문서는 Nado 디자인 시스템에서 Web/Desktop과 Mobile이 공유해야 하는 컴포넌트 API 의미를 정리한다.

v1의 목표는 같은 파일을 모든 플랫폼에서 공유하는 것이 아니다. Web/Desktop은 `@nado/ui`의 React DOM 구현을 사용하고, Mobile은 React Native 구현을 별도로 유지하되 같은 token source와 prop contract를 따른다.

## Import policy

Web/Desktop:

```tsx
import { Button } from "@nado/ui";
```

Web/Desktop explicit subpath:

```tsx
import { Button } from "@nado/ui/web";
```

Mobile v1:

```tsx
import { nativeTokens } from "@nado/tokens/react-native";
```

Mobile v1 primitive package:

```tsx
import { Badge, Button, Card, Chip, Stack, Text } from "@nado/ui-native";
```

Mobile v1 facade subpath:

```tsx
import { Badge, Button, Card, Chip, Stack, Text } from "@nado/ui/native";
```

Mobile은 v1에서 `@nado/ui` root를 직접 import하지 않는다. `Button.web.tsx`, `Button.native.tsx`도 현재 만들지 않는다.

v2 목표는 `@nado/ui`를 facade로 두고 platform subpath를 더 명확히 분리하는 것이다. 현재 facade subpath는 Web/Desktop explicit subpath인 `@nado/ui/web`과 Mobile explicit subpath인 `@nado/ui/native`를 제공한다. `@nado/ui/native`는 `@nado/ui-native`를 re-export한다.

```tsx
// Web / Desktop
import { Button } from "@nado/ui/web";

// React Native
import { Button } from "@nado/ui/native";
```

이 목표 구조의 migration 순서는 [UI package facade migration](ui-package-facade-migration.md)을 따른다. 기본 `import { Button } from "@nado/ui"` cross-platform entry는 bundler별 조건부 export가 검증된 뒤에만 연다.

## 현재 구현

현재 Web/Desktop 공통 패키지에 실제 구현된 기본 component는 `Button`, `Text`, `Stack`, `Card`, `Badge`이다. Web/Desktop에는 기존 DOM surface인 `Chip`도 있다. Mobile 공통 패키지는 `Button`, `Text`, `Stack`, `Card`, `Badge`, `Chip`을 구현한다. Web/Desktop은 `@nado/ui`, `@nado/ui/web`, `@nado/ui-web`, Mobile은 `@nado/ui/native`와 `@nado/ui-native`가 담당한다.

| Component | Package                              | Platform    | Status      |
| --------- | ------------------------------------ | ----------- | ----------- |
| `Button`  | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Text`    | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Stack`   | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Card`    | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Badge`   | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Chip`    | `@nado/ui`, `@nado/ui/web`           | Web/Desktop | 구현됨      |
| `Button`  | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Text`    | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Stack`   | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Card`    | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Badge`   | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Chip`    | `@nado/ui/native`, `@nado/ui-native` | Mobile      | 구현됨      |
| `Avatar`  | 후보                                 | 공통 계약   | 목표 계약만 |

미구현 component는 이 문서에서 목표 계약만 고정한다. 실제 export는 별도 작업에서 추가한다. Avatar는 [Avatar 반복 점검과 도입 기준](avatar-repeat-audit.md)에서 현재 반복 기준을 충족하지 않는 것으로 정리했으므로, 구현은 반복 surface가 생긴 뒤 별도 PR로 판단한다. 앱 전체 마이그레이션과 기본 `@nado/ui` conditional export 개방도 별도 PR로 분리한다.

## Button

현재 Web/Desktop 구현은 `@nado/ui`의 `Button`이다.

```tsx
<Button variant="primary" size="md">
  Save
</Button>
```

현재 계약:

| Prop        | 값                                      | 의미                                            |
| ----------- | --------------------------------------- | ----------------------------------------------- |
| `variant`   | `primary`, `secondary`, `ghost`, `send` | 버튼의 제품 의미와 색상 계층                    |
| `size`      | `sm`, `md`, `icon`                      | 버튼 높이, 가로 padding, icon button 크기       |
| `isLoading` | `boolean`                               | 실행 중 상태. 클릭 불가와 busy 표시를 함께 담당 |
| `disabled`  | DOM button 기본 속성                    | 사용자 interaction 비활성화                     |

`lg` size는 v1 계약에 포함하지 않는다. `tokens.component.button.size.lg`와 Web/RN 구현이 함께 준비된 뒤 확장한다.

플랫폼별 구현 원칙:

- Web/Desktop은 `<button>`과 CSS class, CSS custom property를 사용한다.
- Mobile은 `Pressable` 기반 `@nado/ui-native` 구현을 `@nado/ui/native` facade로 사용한다.
- 양쪽 모두 `variant`, `size`, loading/disabled 의미는 맞춘다.
- 접근성 label은 icon-only button에서 필수다.

## Text

현재 Web/Desktop 및 Mobile 구현:

```tsx
<Text size="lg" tone="muted">
  Hello
</Text>
```

| Prop     | 값                                      | 의미                         |
| -------- | --------------------------------------- | ---------------------------- |
| `size`   | `xs`, `sm`, `md`, `lg`, `xl`            | 글자 크기와 line-height 단계 |
| `weight` | `regular`, `medium`, `bold`, `heavy`    | font-weight 의미             |
| `tone`   | `default`, `muted`, `primary`, `danger` | semantic color 의미          |
| `align`  | `start`, `center`, `end`                | 텍스트 정렬                  |

Web/Desktop은 `<p>`와 CSS class, CSS custom property를 사용한다. `size`, `line-height`, `weight` 값은 `@nado/tokens`의 `tokens.typography.text`를 기준으로 맞춘다. Mobile은 `Text`와 RN style로 구현하되 같은 prop 이름과 의미를 따른다.

## Stack

현재 Web/Desktop 및 Mobile 구현:

```tsx
<Stack gap="md" direction="vertical">
  {children}
</Stack>
```

| Prop        | 값                                  | 의미                  |
| ----------- | ----------------------------------- | --------------------- |
| `gap`       | `xs`, `sm`, `md`, `lg`, `xl`        | token 기반 child 간격 |
| `direction` | `vertical`, `horizontal`            | 쌓는 방향             |
| `align`     | `start`, `center`, `end`, `stretch` | 교차축 정렬           |

Web/Desktop은 flex/grid, Mobile은 `View`와 RN style로 구현한다. `gap`은 반드시 token 이름을 받는다.
현재 Web/Desktop `Stack`의 `gap` 값은 `@nado/tokens`의 `tokens.spacing` 단계와 맞춘다.

## Card

현재 Web/Desktop 및 Mobile 구현:

```tsx
<Card padding="lg" tone="surface">
  {children}
</Card>
```

| Prop      | 값                             | 의미                         |
| --------- | ------------------------------ | ---------------------------- |
| `padding` | `sm`, `md`, `lg`, `xl`         | 내부 여백 token 단계         |
| `tone`    | `surface`, `muted`, `elevated` | 배경과 border/elevation 의미 |
| `radius`  | `sm`, `md`, `composer`         | border radius token 단계     |

Card는 layout shell과 repeated item card를 구분해서 도입한다. 모든 section을 Card로 감싸는 패턴은 피한다.

## Badge

현재 Web/Desktop 구현은 `@nado/ui`, `@nado/ui/web`, `@nado/ui-web`에서 제공한다. Mobile 구현은 `@nado/ui-native`와 `@nado/ui/native`에서 제공한다.

목표 계약:

```tsx
<Badge tone="success">Saved</Badge>
```

| Prop   | 후보 값                                              | 의미                |
| ------ | ---------------------------------------------------- | ------------------- |
| `tone` | `neutral`, `primary`, `success`, `warning`, `danger` | 상태 색상 의미      |
| `size` | `sm`, `md`                                           | 높이와 padding 단계 |

Badge는 상태 표시 전용이다. 클릭 가능한 요소가 필요하면 Button 또는 Chip 계열로 분리한다.

## Chip

현재 Web/Desktop 구현은 `@nado/ui`, `@nado/ui/web`, `@nado/ui-web`에서 제공한다. Mobile 구현은 `@nado/ui-native`와 `@nado/ui/native`에서 제공한다.

현재 Web/Desktop 계약:

```tsx
<Chip as="button" label="setup · 준비" prefix="+ 저장" disabled />
<Chip as="span" label="setup · 준비" prefix="+" />
```

| Prop       | 현재 값/타입               | 의미                                       |
| ---------- | -------------------------- | ------------------------------------------ |
| `label`    | `string`                   | chip의 주 텍스트                           |
| `prefix`   | `string`                   | 저장 상태나 분류를 나타내는 보조 텍스트    |
| `disabled` | `boolean`                  | 저장 중/저장됨 등 interaction 비활성화     |
| `as`       | `button`, `span`           | DOM 전용 렌더링 선택                       |
| DOM attrs  | button/span 기본 attribute | Web/Desktop 이벤트와 접근성 attribute 전달 |

Mobile 현재 계약:

```tsx
<Chip label="setup" prefix="+ 저장" disabled onPress={saveSuggestion} />
```

| Prop       | 값/타입            | 판단                                                                                   |
| ---------- | ------------------ | -------------------------------------------------------------------------------------- |
| `label`    | `string`           | Web/Desktop 현재 계약과 Mobile `suggestionChip` 후보가 공유할 수 있다.                 |
| `prefix`   | `string`           | 저장 가능, 저장 중, 저장됨 같은 compact 상태 표시를 맡는다.                            |
| `disabled` | `boolean`          | action chip의 interaction 차단 의미로 유지한다.                                        |
| `onClick`  | Web/Desktop event  | 기존 DOM `Chip` 계약을 유지한다.                                                       |
| `onPress`  | React Native event | Mobile `Chip` interaction handler다.                                                   |
| `as`       | Web/Desktop only   | Mobile public contract로 옮기지 않는다. 비상호작용 Mobile Chip은 별도 판단이 필요하다. |
| `tone`     | 보류               | saved/saving state token이 생기기 전까지 공통 계약에 넣지 않는다.                      |

v1에서 Chip은 `label`, `prefix`, `disabled`를 공유 가능한 핵심 prop으로 본다. action handler 이름은 현재 Web/Desktop의 `onClick`과 React Native의 `onPress`가 달라서, 기본 `@nado/ui` cross-platform entry로 홍보하지 않는다. 나중에 양쪽 구현이 모두 준비되면 공통 action prop을 별도 PR에서 검토한다.

## Avatar

현재 구현 상태: Web/Desktop과 Mobile 모두 런타임 구현은 없다. 현재 제품 표면에는 사용자 이미지, initials fallback, profile identity visual이 2곳 이상 반복되지 않으므로 목표 계약만 유지한다.

목표 계약:

```tsx
<Avatar name="Koo" size="md" />
```

| Prop   | 후보 값          | 의미                                    |
| ------ | ---------------- | --------------------------------------- |
| `name` | `string`         | fallback initials와 accessibility label |
| `src`  | `string`         | 이미지 URL                              |
| `size` | `sm`, `md`, `lg` | 정사각형 크기 token 단계                |

Avatar는 이미지 로딩 실패, initials fallback, accessibility label을 기본 계약에 포함한다.

구현은 실제 profile/account 또는 작성자 표시 표면이 반복될 때 진행한다. 브랜드 mark, 로그인 버튼, email 텍스트만 있는 인증 상태 표시는 Avatar 도입 근거로 보지 않는다.

## Future capabilities

다음 항목은 component API가 아니라 platform adapter 또는 service contract로 다룬다.

| Capability  | v1 처리                  | 후속 설계 기준                               |
| ----------- | ------------------------ | -------------------------------------------- |
| File upload | 구현하지 않음            | picker/input 결과 shape부터 정의             |
| Tooltip     | 구현하지 않음            | hover/focus와 touch 대체 UI 분리             |
| Toast       | renderer 구현하지 않음   | message contract와 platform renderer 분리    |
| Common API  | `@nado/shared` 계약 우선 | 앱별 client 중복이 커질 때 `@nado/core` 검토 |

## Acceptance 기준

- 실제 구현된 API와 목표 API를 섞어 말하지 않는다.
- Mobile v1은 `@nado/ui`를 import하지 않는다.
- 새 component를 만들 때는 먼저 token이 있는지 확인한다.
- Web/Desktop과 RN 구현은 파일이 달라도 prop 이름과 제품 의미를 맞춘다.
