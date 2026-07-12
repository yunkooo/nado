# 디자인 값 일치 검증

목표는 Web CSS를 Mobile에 복사하는 것이 아니다. 두 플랫폼이 `@nado/tokens`에서 같은 의미의 값을 읽고 각 플랫폼 구현으로 올바르게 표현하는지 확인한다.

## 확인 위치

| 플랫폼    | 화면                                 | 확인 내용                               |
| --------- | ------------------------------------ | --------------------------------------- |
| Storybook | `Foundations/Tokens`                 | color, spacing, radius, component token |
| Storybook | `UI/Button`과 다른 component stories | Web component 상태                      |
| Expo      | `Mobile Design Demo`                 | Native token과 React Native 기본 UI     |

## Storybook 실행

```bash
pnpm dev:storybook
```

1. `Foundations/Tokens`에서 token 이름과 값을 확인한다.
2. `UI/Button`에서 variant와 size가 token을 따르는지 확인한다.
3. Card, Badge, Chip story와 `Foundations/Tokens`의 복습 카드 값을 확인한다.

## Mobile demo 실행

```bash
pnpm --filter @nado/mobile dev:design
```

`Mobile Design Demo`에서 다음을 Storybook과 비교한다.

- primary, surface, muted color
- spacing과 radius
- Button variant와 size
- Card, Badge, Chip 기본 UI 컴포넌트
- ReviewCard answer color

## 자동 검증

```bash
pnpm --filter @nado/tokens test
pnpm --filter @nado/ui-web test
pnpm --filter @nado/ui test
pnpm --filter @nado/ui-native test
pnpm --filter @nado/mobile test
pnpm --filter @nado/mobile test:design-bundle

pnpm --filter @nado/tokens typecheck
pnpm --filter @nado/ui-web typecheck
pnpm --filter @nado/ui typecheck
pnpm --filter @nado/ui-native typecheck
pnpm --filter @nado/mobile typecheck
```

Storybook을 변경했으면 [Storybook 운영 기준의 네 검증 명령](../../apps/storybook/README.md#검증-명령)을 함께 실행한다. 명령과 bundle 경고 기준은 해당 문서를 단일 원본으로 사용한다.

테스트는 특히 아래 계약을 보호한다.

- `Mobile Design Demo`가 `@nado/ui/native`의 Button, Stack, Text, Card, Badge, Chip을 실제로 가져오는지
- `Mobile Design Demo` component tree가 실제 React render를 통과하고 iOS·Android Metro bundle로 생성되는지
- 복습 카드의 답변 스타일이 `nativeTokens.component.reviewCard.answer`를 따르는지
- Storybook과 Mobile이 같은 component token 이름을 사용하는지
- Storybook story가 실제 Chromium에서 렌더링되고 `play` interaction과 접근성 검사를 통과하는지

## Token 변경 순서

1. `packages/tokens/src`에서 의미 있는 token을 변경한다.
2. Web과 React Native의 플랫폼 변환 코드를 함께 확인한다.
3. Web/Desktop 컴포넌트와 Mobile 기본 UI 컴포넌트를 각각 갱신한다.
4. Storybook과 Mobile demo를 눈으로 비교한다.
5. 관련 test, typecheck, build를 실행한다.

한 플랫폼만 필요한 layout 값은 앱 로컬에 둘 수 있다. 제품 전체에서 같은 의미를 갖는 값만 공통 token으로 올린다.
