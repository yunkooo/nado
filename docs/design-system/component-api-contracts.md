# 컴포넌트 API 계약

이 문서는 현재 구현된 공통 기본 UI 컴포넌트만 설명한다. 실제 type이 다르면 `packages/ui-web/src`와 `packages/ui-native/src`가 기준이다.

## 구현 상태

| 컴포넌트 | Web/Desktop | Mobile |
| -------- | ----------- | ------ |
| `Button` | 구현        | 구현   |
| `Text`   | 구현        | 구현   |
| `Stack`  | 구현        | 구현   |
| `Card`   | 구현        | 구현   |
| `Badge`  | 구현        | 구현   |
| `Chip`   | 구현        | 구현   |

## 공통 의미

### Button

- `variant`: `primary`, `secondary`, `ghost`, `send`
- `size`: `sm`, `md`, `icon`
- `isLoading`: 로딩 상태와 비활성화를 함께 표현
- `disabled`: 사용자 입력 차단

Web은 `<button>`, Mobile은 `Pressable`을 사용한다. Mobile은 `style`과 `textStyle`을 따로 받을 수 있다.

### Text

- `size`: `xs`, `sm`, `md`, `lg`, `xl`
- `weight`: `regular`, `medium`, `bold`, `heavy`
- `tone`: `default`, `muted`, `primary`, `danger`
- `align`: `start`, `center`, `end`

### Stack

- `direction`: `vertical`, `horizontal`
- `gap`: `xs`, `sm`, `md`, `lg`, `xl`
- `align`: `start`, `center`, `end`, `stretch`

Stack은 간격과 정렬만 담당한다. 제품 의미가 있는 layout 이름은 앱에 둔다.

### Card

- `padding`: `sm`, `md`, `lg`, `xl`
- `radius`: `sm`, `md`, `composer`
- `tone`: `surface`, `muted`, `elevated`

### Badge

- `tone`: `neutral`, `primary`, `success`, `warning`, `danger`
- `size`: `sm`, `md`

Badge는 상태나 분류를 표시한다. 클릭 동작을 넣지 않는다.

### Chip

- 공통 의미: 짧은 label, 선택 또는 action, disabled 상태
- 공통 prop: `label`, `prefix`, `disabled`
- Web: `button` 또는 읽기 전용 `span`으로 렌더링 가능
- Mobile: `Pressable` action으로 제공

저장 중·저장됨 같은 제품 상태는 앱에서 계산하고 `disabled`, label, style로 전달한다.

## 공통 컴포넌트 추가 기준

다음 조건을 모두 확인한다.

1. 실제 화면 두 곳 이상에서 같은 역할이 반복된다.
2. token과 prop 의미를 플랫폼 간에 설명할 수 있다.
3. 접근성 역할과 disabled/loading 상태가 정의되어 있다.
4. package test와 실제 적용 표면을 함께 추가할 수 있다.

`Avatar`와 `SegmentedControl`은 반복 사용처가 충분하지 않아 아직 구현하지 않는다. 재검토 기준은 [결정 문서](decisions.md)에 있다.

Web과 Native가 공유하는 variant, size, tone과 공통 prop 타입은 `packages/ui/src/platformContracts.test.ts`의 compile-time assertion으로 함께 검증한다.
