# Mobile/Web Chip 경계와 action chip 후보

이 문서는 Mobile `suggestionChip`을 바로 `@nado/ui-native Chip`으로 옮기기 전에 Web/Desktop `Chip` public surface와 비교한 기록이다. 기준 소스는 `apps/mobile/App.tsx`, `apps/mobile/src/styles/mobileStyles.ts`, `packages/ui-web/src/Chip.tsx`, `packages/ui-web/src/VocabularySuggestionList.tsx`이다.

## 결론

Mobile `suggestionChip`은 Badge가 아니라 action chip 후보다. Web/Desktop의 `Chip`과 의미가 가장 가깝지만, Mobile에는 `saved`, `saving`, `disabled`, pressed feedback이 저장 action 흐름에 강하게 묶여 있다.

따라서 바로 앱 전체 치환으로 시작하지 않고, 먼저 `Chip` 공통 API 후보와 `@nado/ui-native Chip` 최소 구현을 분리했다. 이후 실제 앱 표면은 분석 결과의 저장 추천 `suggestionChip` 1곳에만 `@nado/ui/native` `Chip`을 적용했다.

## 현재 Web/Desktop Chip

`packages/ui-web/src/Chip.tsx`는 다음 public surface를 가진다.

| Prop       | 현재 의미                                       |
| ---------- | ----------------------------------------------- |
| `as`       | `button` 또는 `span` 렌더링 선택                |
| `label`    | chip의 주 텍스트                                |
| `prefix`   | 저장 표시, 분류명 같은 보조 텍스트              |
| `disabled` | button disabled 또는 span의 `aria-disabled`     |
| DOM attrs  | `button` 또는 `span` 기본 attribute passthrough |

`VocabularySuggestionList`는 저장 추천을 `Chip`으로 렌더링한다. 저장 action이 있을 때는 `as="button"`, 없을 때는 `as="span"`을 사용하고, 저장 상태에 따라 prefix와 disabled를 바꾼다.

## 현재 Mobile suggestionChip

Mobile `suggestionChip`은 저장 action이며, 현재 분석 결과의 저장 추천 목록은 `@nado/ui/native` `Chip`을 사용한다.

| 상태     | 현재 렌더링                                   |
| -------- | --------------------------------------------- |
| `idle`   | `+` prefix, 저장 가능, pressed feedback       |
| `saving` | 저장 중 prefix, disabled, opacity 감소        |
| `saved`  | `✓` prefix, disabled, saved background/border |

현재 base layout, pressed feedback, 긴 label overflow 제약은 `@nado/ui-native Chip` primitive가 담당한다. 앱 style은 저장 상태 override만 남긴다.

- state별 `suggestionChipSaved`, `suggestionChipSaving`

## Badge와 구분

`Badge`는 상태나 분류를 표시하는 비상호작용 primitive다. Mobile `vocabularyType`처럼 품사/type을 보여주는 경우에 맞는다.

`suggestionChip`은 사용자가 누르는 저장 action이고, 저장 중/저장됨 상태가 interaction을 막는다. 이 때문에 `Badge` contract로 흡수하면 `onPress`, `disabled`, `saving`, `saved` 같은 action 상태가 Badge에 들어가게 된다. Badge는 이 방향으로 확장하지 않는다.

## Button과 구분

`suggestionChip`은 `Pressable`이라 interaction 의미는 Button과 가깝다. 다만 화면상 역할은 일반 명령 버튼보다 추천 단어 목록의 compact item이다.

Button으로 치환하면 `label + prefix`, wrap row layout, 저장 추천 목록의 chip density를 Button variant에 억지로 넣게 된다. `Button`은 계속 명령 button, `Chip`은 compact selectable/action item 후보로 구분한다.

## Chip API 후보

다음 티켓에서 검토할 공통 계약 후보는 아래 범위로 제한한다.

```tsx
<Chip label="setup" prefix="+ 저장" disabled />
```

| Prop                  | 후보 값/타입     | 비고                                                  |
| --------------------- | ---------------- | ----------------------------------------------------- |
| `label`               | `string`         | Web/Desktop 기존 계약 유지                            |
| `prefix`              | `string`         | 저장 상태 또는 분류 보조 텍스트                       |
| `disabled`            | `boolean`        | 저장 중/저장됨 interaction 차단                       |
| `onPress` / `onClick` | platform별 event | 같은 이름으로 합칠지 별도 검토 필요                   |
| `tone`                | 보류             | saved/saving 상태 token이 생기기 전까지 도입하지 않음 |

`as="span"`은 DOM 전용 의미라 Mobile public contract에 그대로 옮기지 않는다. Mobile에서 비상호작용 Chip이 필요해질 때 `onPress` 유무로 렌더링을 분기할지, 별도 prop을 둘지 다시 판단한다.

## Token 후보

첫 구현은 기존 primitive/semantic token으로 시작했고, Web/Desktop `nado-chip`과 Mobile `suggestionChip` 실제 적용 뒤 기본 surface를 `component.chip`으로 승격했다.

- background: `component.chip.background`
- foreground: `component.chip.foreground`
- prefix foreground: `component.chip.prefix`
- border: `component.chip.border`
- radius: `component.chip.radius`
- gap: `component.chip.gap`
- min height: `component.chip.minHeight`
- padding: `component.chip.paddingX`, `component.chip.paddingY`
- saved background: `color.sidebar`
- saved border: `color.sidebarActive`

saved/saving state는 아직 앱 흐름에 강하게 묶여 있으므로 component token으로 올리지 않는다. 두 플랫폼의 기본 action chip surface가 함께 움직여야 할 때는 `component.chip`을 쓰고, 저장 상태 전용 색상은 반복이 더 확인될 때 별도 state token으로 검토한다.

## 다음 티켓 후보

1. Chip 공통 API 후보 문서화
   - 완료: `component-api-contracts.md`에 Chip을 공통 계약 후보로 추가한다.
   - 완료: `onPress`와 `onClick`, DOM `as`, RN 비상호작용 렌더링 방식의 v1 판단을 기록한다.

2. `@nado/ui-native Chip` 최소 구현
   - 완료: package component와 style helper를 먼저 만든다.
   - 완료: 앱 화면 치환은 하지 않는다.

3. Mobile `suggestionChip`에 Native Chip 적용
   - 완료: 분석 저장 추천 chip만 적용한다.
   - 완료: word popover 저장 버튼과 review direction은 변경하지 않는다.

4. Segmented control 후보 분리
   - `reviewDirection`은 Chip이 아니라 선택 control로 계속 분리한다.

5. Chip 기본 component token 추가
   - 완료: `component.chip`을 추가하고 Web/Desktop CSS와 `@nado/ui-native` style helper가 같은 기본 surface token을 사용한다.
   - 완료: saved/saving 상태 token은 추가하지 않고 앱 local override로 유지한다.
