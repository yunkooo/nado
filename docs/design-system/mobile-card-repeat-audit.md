# Mobile Card 반복 점검과 token 후보

이 문서는 `@nado/ui-native Card` 구현을 판단하기 위해 Mobile 화면의 Card 성격 반복과 token 후보를 점검한 기록이다. 기준 소스는 `apps/mobile/App.tsx`와 `apps/mobile/src/styles/mobileStyles.ts`이다.

## 결론

Mobile에는 Card로 볼 수 있는 반복 surface가 충분하다. `@nado/ui-native Card` 최소 구현은 package component, style helper, unit test 범위로 진행하고, 앱 전체 치환은 하지 않는다.

이 점검 결과에 따라 `@nado/ui-native Card`는 `padding`, `tone`, `radius` 계약으로 구현한다. `VocabularyPage`나 `ReviewPage` 적용은 후속 티켓에서 낮은 위험 표면 1곳만 선택한다.

## Card 후보

| 후보 style           | 현재 위치                 | 반복 성격                                      | 판단                         |
| -------------------- | ------------------------- | ---------------------------------------------- | ---------------------------- |
| `vocabularyItem`     | 단어장 저장 항목          | surface, border, radius, padding, shadow 반복  | `Card tone="elevated"` 후보  |
| `reviewCard`         | 복습 flashcard            | surface, border, radius, padding, shadow 반복  | `Card tone="elevated"` 후보  |
| `wordDefinitionCard` | 분석 단어 뜻 카드/Popover | surface, border, radius, padding, shadow 반복  | `Card tone="elevated"` 후보  |
| `summaryItem`        | 단어장 요약               | compact surface, border, radius, padding 반복  | `Card tone="surface"` 후보   |
| `meaningCard`        | 단어 뜻 내부 meaning 항목 | nested muted surface, compact padding 반복     | `Card tone="muted"` 후보     |
| `emptyPanel`         | 빈 상태/에러 상태         | feedback panel surface 반복                    | Card보다 Panel 후보에 가깝다 |
| `statusCard`         | 분석 상태 메시지          | feedback panel surface 반복                    | Card보다 Panel 후보에 가깝다 |
| `modelSelectorCard`  | 모델 선택 overlay         | popup-specific position과 shadow가 핵심        | Card 공통화 대상에서 제외    |
| `resultArea`         | 분석 결과 전체 shell      | header, section separator, overflow 조합       | layout shell이라 제외        |
| `sentenceCard`       | 문장별 분석 항목          | surface 없이 text/chunk layout이 핵심          | 현재 Card 후보 아님          |
| `composer`           | 분석 입력기               | input container state와 composer radius가 핵심 | Card 공통화 대상에서 제외    |

## Web/Desktop Card 계약 매핑

현재 Web/Desktop Card 계약은 `padding`, `tone`, `radius`를 중심으로 한다. Mobile에서도 같은 prop 이름은 유지할 수 있다.

| Prop      | Mobile 매핑 후보               | 비고                                                                                 |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `padding` | `sm`, `md`, `lg`, `xl`         | `meaningCard`, `wordDefinitionCard`, `vocabularyItem`, `reviewCard` 단계로 대응 가능 |
| `tone`    | `surface`, `muted`, `elevated` | `elevated`는 RN에서 `shadow*`와 `elevation`을 포함한다                               |
| `radius`  | `sm`, `md`, `composer`         | `composer`는 입력기 전용에 가까워 기본 Card 사용은 신중히 한다                       |

## Token 후보

primitive/semantic token은 이미 대부분 존재한다.

- primitive/semantic: `color.surface`, `color.surfaceMuted`, `color.border`, `radius.md`, `spacing`
- component: `button`, `reviewCard.answer`

Card 최소 구현은 기존 primitive/semantic token으로 시작한다. 다음 component token은 실제 화면 적용 중 반복과 차이가 커질 때 추가를 검토한다.

| Token 후보                | 성격      | 이유                                     |
| ------------------------- | --------- | ---------------------------------------- |
| `component.card.surface`  | component | 공통 surface/background/border 의미 고정 |
| `component.card.muted`    | component | nested muted card와 compact surface 대응 |
| `component.card.elevated` | component | shadow/elevation을 플랫폼별로 묶기 위함  |
| `component.card.padding`  | component | Card padding 단계를 prop contract와 연결 |
| `component.card.radius`   | component | Card radius 단계를 prop contract와 연결  |

`reviewCard.answer`는 Card container가 아니라 answer state surface이므로 `component.card`로 합치지 않는다. 품사 pill인 `vocabularyType`은 Card가 아니라 Badge 후보로 분리한다.

## 진행 상태와 다음 티켓 후보

1. `@nado/ui-native Card` 최소 구현
   - 완료: `Card` component와 `createCardStyle`을 추가한다.
   - 완료: `tone`, `padding`, `radius` prop contract를 Web/Desktop Card와 맞춘다.
   - 완료: 앱 화면 치환은 하지 않는다.

2. Mobile 실제 화면 1곳에 Native Card 적용
   - `summaryItem`이나 `wordDefinitionCard`처럼 범위가 작고 시각 회귀를 확인하기 쉬운 표면을 고른다.
   - `reviewCard`와 `vocabularyItem`은 shadow와 minHeight 영향이 커서 첫 적용 후보에서는 한 단계 뒤로 둔다.

3. Badge 반복 점검
   - `vocabularyType`, suggestion chip, review direction pill은 Badge/Chip 경계를 따로 판단한다.
