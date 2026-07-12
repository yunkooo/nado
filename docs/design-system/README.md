# 디자인 시스템

`nado`는 디자인 값을 공유하고 렌더링 구현은 플랫폼별로 나눈다.

```text
@nado/tokens
├── Web token
└── @nado/tokens/react-native

@nado/ui
├── root, /web → @nado/ui-web
└── /native    → @nado/ui-native
```

## 패키지 역할

| 패키지            | 역할                                                                |
| ----------------- | ------------------------------------------------------------------- |
| `@nado/tokens`    | 색상, 간격, radius, component token의 원본                          |
| `@nado/ui-web`    | React DOM 기반 Web/Desktop 컴포넌트                                 |
| `@nado/ui-native` | React Native 컴포넌트                                               |
| `@nado/ui`        | Web과 Native 구현을 `/web`, `/native`로 제공하는 공개 import 진입점 |

## Import 기준

### Web과 Desktop

```ts
import { Button } from "@nado/ui/web";
import "@nado/ui/web/styles.css";
```

기존 `@nado/ui`와 `@nado/ui/styles.css`는 Web 호환 경로다. Mobile에서 root import를 사용하지 않는다.

Web CSS의 원본은 `@nado/ui-web/styles.css` 하나이며, `@nado/ui/styles.css`와 `@nado/ui/web/styles.css`는 이 파일을 불러오는 공개 façade다.

Desktop처럼 초기 번들 경계를 세밀하게 나눠야 할 때는 package export가 열린 구현 subpath를 직접 사용할 수 있다.

```ts
import { Button } from "@nado/ui-web/Button";
```

구현 package 직접 import는 측정된 번들 이유가 있을 때만 사용한다.

### Mobile

```ts
import { Button, Card, Text } from "@nado/ui/native";
import { nativeTokens } from "@nado/tokens/react-native";
```

`@nado/ui/native`는 `@nado/ui-native`를 재노출한다. React Native 화면은 DOM 컴포넌트와 CSS를 import하지 않는다.

## 공유 원칙

1. 새 디자인 값은 먼저 `@nado/tokens`에 의미 있는 이름으로 추가한다.
2. Web과 Native 구현은 같은 token 의미와 prop 이름을 사용한다.
3. DOM event와 React Native `Pressable` 동작은 억지로 같은 내부 코드로 만들지 않는다.
4. 제품 도메인 schema는 `@nado/shared`, 시각 규칙은 token/UI 패키지가 담당한다.
5. 새 공통 컴포넌트는 두 곳 이상에서 반복되고 실제 사용 예가 있을 때 추가한다.

## 현재 검증 위치

| 대상                         | 확인 위치                                         |
| ---------------------------- | ------------------------------------------------- |
| token과 Web/Desktop 컴포넌트 | Storybook `Foundations/Tokens`, component stories |
| React Native token과 기본 UI | Expo `Mobile Design Demo`                         |
| package export와 prop 계약   | 각 package test와 typecheck                       |

실행 방법은 [디자인 값 일치 검증](token-parity-demo.md)을 참고한다.

## 관련 문서

- [현재 컴포넌트 계약](component-api-contracts.md)
- [디자인 값 일치 검증](token-parity-demo.md)
- [보류 결정과 재검토 조건](decisions.md)
