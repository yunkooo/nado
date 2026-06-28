# Mobile Badge/Chip 반복 점검과 경계

이 문서는 `@nado/ui-native Badge` 또는 `Chip` 구현을 진행하기 전에 Mobile 화면의 작은 표시/선택 UI를 점검한 기록이다. 기준 소스는 `apps/mobile/App.tsx`, `apps/mobile/src/styles/mobileStyles.ts`, Web/Desktop의 `packages/ui-web/src/Chip.tsx`, 공통 목표 계약은 `docs/design-system/component-api-contracts.md`이다.

## 결론

Mobile에는 Badge 후보가 있지만, 모든 pill 형태 UI를 Badge로 묶으면 안 된다. `Badge`는 상태나 분류를 표시하는 비상호작용 UI로 제한하고, 누를 수 있는 추천 단어 저장 UI는 `Chip`, 선택 모드는 segmented control 성격으로 분리한다.

따라서 `@nado/ui-native Badge` 최소 구현은 앱 화면 치환 없이 먼저 만들고, 다음 실제 적용 후보는 `vocabularyType` 하나로 제한한다. `suggestionChip`과 `reviewDirection`은 Badge 적용 PR에 섞지 않는다.

## 후보 점검

| 후보 style        | 현재 위치           | 현재 역할                          | 판단                         |
| ----------------- | ------------------- | ---------------------------------- | ---------------------------- |
| `vocabularyType`  | 저장 단어 품사 표시 | 품사/type을 읽기 전용 pill로 표시  | `Badge tone="neutral"` 후보  |
| `suggestionChip`  | 분석 우선 저장 추천 | 누르면 저장되는 action chip        | Badge 제외, Chip/Button 후보 |
| `reviewDirection` | 복습 방향 선택      | 두 선택지 중 하나를 고르는 control | Badge 제외, segmented 후보   |

`vocabularyType`은 텍스트 기반 상태 표시이고 `Pressable`이 아니므로 Badge 목표 계약과 가장 잘 맞는다. 반대로 `suggestionChip`은 저장 action, disabled/saved/saving 상태, pressed feedback이 함께 있어 Button 또는 Chip 계열로 따로 다뤄야 한다. `reviewDirection`은 `accessibilityState={{ selected }}`를 가진 선택 control이므로 Badge보다 segmented control에 가깝다.

## Web/Desktop 경계

Web/Desktop에는 이미 `Chip` public surface가 있다.

- `packages/ui-web/src/Chip.tsx`는 `as="button"`과 `as="span"`을 모두 지원한다.
- `VocabularySuggestionList`는 저장 추천 UI에 `Chip`을 사용한다.
- 현재 공통 `Badge` 목표 계약은 `tone`, `size`, `children` 중심이며, 상태 표시 전용으로 문서화되어 있다.

이 차이를 유지한다. Badge는 `Chip`을 대체하지 않고, 클릭 가능한 pill은 Chip 또는 Button 계열로 분리한다.

## 목표 계약 후보

`component-api-contracts.md`의 목표 계약을 그대로 유지한다.

```tsx
<Badge tone="neutral" size="sm">
  noun
</Badge>
```

| Prop   | Mobile 첫 매핑 후보                                  | 비고                                                      |
| ------ | ---------------------------------------------------- | --------------------------------------------------------- |
| `tone` | `neutral`, `primary`, `success`, `warning`, `danger` | 공통 Badge 계약을 유지한다. 첫 실제 적용은 `neutral` 후보 |
| `size` | `sm`, `md`                                           | 첫 적용은 `vocabularyType`의 `sm`                         |

## Token 후보

첫 구현은 기존 primitive/semantic token으로 시작했다.

- background: `color.surfaceMuted`
- foreground: `color.inkMuted`
- border: `color.border`
- radius: `radius.pill`
- padding: `spacing.sm` 기반

component token은 여러 tone이 실제 화면에서 반복될 때 검토한다. `suggestionChip`의 saved/saving 상태는 Badge token이 아니라 Chip action state token 후보로 따로 둔다.

## 다음 티켓 후보

1. `@nado/ui-native Badge` 최소 구현
   - 완료: `Badge` component와 style helper를 추가했다.
   - 완료: `tone`, `size`, `children` 계약을 고정했다.
   - 완료: 앱 화면 치환은 하지 않았다.

2. Mobile `vocabularyType`에 Native Badge 적용
   - 저장 단어 품사 pill만 `@nado/ui/native` Badge로 적용한다.
   - `suggestionChip`과 `reviewDirection`은 변경하지 않는다.

3. Mobile/Web Chip 경계 점검
   - 저장 추천 action chip을 Web/Desktop `Chip` 계약과 맞출 수 있는지 별도 판단한다.
   - saved/saving/disabled 상태가 Button contract와 더 맞는지도 함께 본다.

4. Segmented control 후보 분리
   - `reviewDirection`은 Badge/Chip이 아니라 선택 control로 별도 후보에 남긴다.
