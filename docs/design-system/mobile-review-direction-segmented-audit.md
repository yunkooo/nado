# Mobile reviewDirection segmented control 경계

이 문서는 Mobile 복습 화면의 `reviewDirection`을 Badge, Chip, Button, SegmentedControl 중 어디에 둘지 판단한 기록이다. 기준 소스는 `apps/mobile/App.tsx`, `apps/mobile/src/styles/mobileStyles.ts`, Web/Desktop의 `ReviewSessionView.tsx`와 review CSS다.

## 결론

`reviewDirection`은 Badge나 Chip이 아니라 segmented control 후보다. 다만 현재 실제 제품 표면은 복습 방향 선택 1곳뿐이므로, `@nado/ui-web` 또는 `@nado/ui-native` 런타임 primitive를 바로 만들지 않는다.

다음 조건을 만족할 때 별도 티켓으로 `SegmentedControl` 구현을 검토한다.

- Web/Desktop과 Mobile에서 같은 선택 UI가 2곳 이상 반복된다.
- 옵션 수, selected state, disabled state, 접근성 역할이 같은 prop contract로 표현된다.
- Button이나 Chip variant로 흡수하면 의미가 흐려지는 선택 전용 UI가 반복된다.

## 현재 표면

| Platform     | 위치                                     | 현재 구현                          | 접근성 상태                         | 판단                   |
| ------------ | ---------------------------------------- | ---------------------------------- | ----------------------------------- | ---------------------- |
| Web          | `apps/web/src/features/review`           | `button` group                     | `aria-pressed`                      | segmented control 후보 |
| Desktop      | `apps/desktop/src/features/review`       | Web과 같은 `button` group          | `aria-pressed`                      | segmented control 후보 |
| Mobile       | `apps/mobile/App.tsx`                    | `Pressable` row                    | `accessibilityState={{ selected }}` | segmented control 후보 |
| Mobile style | `apps/mobile/src/styles/mobileStyles.ts` | `reviewDirection*` local style set | selected style 분리                 | 앱 local style 유지    |

Web/Desktop과 Mobile 모두 `english-to-korean`, `korean-to-english` 두 값을 단일 선택한다. 하지만 DOM은 keyboard/pressed state를 `button`으로 처리하고, React Native는 touch selection state를 `Pressable`과 `selected` state로 처리한다. 따라서 같은 파일 공유보다 같은 option/value contract를 공유하는 쪽이 맞다.

## Badge, Chip, Button과 구분

- Badge는 상태나 분류를 읽기 전용으로 표시한다. `reviewDirection`은 사용자가 현재 선택값을 바꾸므로 Badge가 아니다.
- Chip은 compact item 또는 action chip이다. `reviewDirection`은 저장 추천 chip처럼 리스트 item을 누르는 흐름이 아니라, 두 모드 중 하나를 선택하는 control이다.
- Button은 명령을 실행한다. `reviewDirection`은 즉시 명령보다 선택 state를 유지하는 UI라 Button variant로 확장하면 선택 의미가 흐려진다.

## 목표 계약 후보

런타임 구현이 필요해질 때 최소 API는 아래 범위에서 다시 검토한다.

```tsx
<SegmentedControl
  accessibilityLabel="복습 방향"
  options={[
    { label: "영어 -> 한국어", value: "english-to-korean" },
    { label: "한국어 -> 영어", value: "korean-to-english" },
  ]}
  value={direction}
  onValueChange={setDirection}
/>
```

| Prop                 | 후보 값/타입                         | 의미                             |
| -------------------- | ------------------------------------ | -------------------------------- |
| `accessibilityLabel` | `string`                             | control group의 접근성 이름      |
| `options`            | `{ label: string; value: string }[]` | 표시 label과 selected value 후보 |
| `value`              | `string`                             | 현재 선택값                      |
| `onValueChange`      | `(value: string) => void`            | 선택 변경 callback               |
| `disabled`           | `boolean`                            | 전체 control 비활성화 후보       |
| `size`               | `sm`, `md`                           | 반복 표면이 생길 때 추가 검토    |

Web/Desktop은 `button` 또는 `role="group"` 안의 button으로 구현할 수 있고, Mobile은 `Pressable`과 `accessibilityState.selected`를 사용한다. keyboard arrow 이동, radio group role, touch target 기준은 실제 구현 PR에서 플랫폼별로 다시 검토한다.

## Token 후보

현재는 새 token을 추가하지 않는다. 기존 값은 semantic token으로 충분하다.

- background: `color.surface`
- active background: `color.sidebarActive`
- foreground: `color.inkMuted`
- active foreground: `color.ink`
- border: `color.border`
- radius: `radius.md`
- gap/padding: `spacing.sm` 또는 local 12px

반복이 생기면 `component.segmentedControl` 또는 `component.selectionControl` 이름을 검토한다. `reviewDirection` 전용 token 이름은 제품 흐름에 너무 묶이므로 피한다.

## 다음 티켓 후보

1. `SegmentedControl` runtime primitive 구현
   - 보류: 현재 반복 표면이 1곳뿐이다.
   - 조건: 두 번째 선택 control이 생기거나 review direction을 Web/Desktop/Mobile 공통 primitive로 옮길 필요가 생길 때 진행한다.

2. review direction option contract 공유
   - 보류: 현재 Web/Desktop/Mobile review helper가 앱별로 분리되어 있다.
   - 조건: review domain helper를 `@nado/shared`로 옮길 필요가 생기면 design-system이 아니라 domain/shared 티켓으로 분리한다.

3. component token 확장
   - 보류: segmented control runtime primitive를 만들 때 함께 판단한다.
