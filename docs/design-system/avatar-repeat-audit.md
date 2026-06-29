# Avatar 반복 점검과 도입 기준

이 문서는 `Avatar`를 `@nado/ui-web`과 `@nado/ui-native`에 구현하기 전에 실제 제품 표면에서 반복이 충분한지 확인한 기록이다.

점검일: 2026-06-29

## 점검 범위

| 파일                                                   | 확인한 내용                                            |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `apps/web/src/components/AuthControls.tsx`             | 인증된 사용자의 email 텍스트와 로그인/로그아웃 버튼    |
| `apps/desktop/src/auth/AuthControls.tsx`               | Desktop 인증 상태 표시와 로그인/로그아웃 버튼          |
| `apps/mobile/App.tsx`                                  | 상단 브랜드 영역, 로그인/로그아웃 버튼, 인증 상태 흐름 |
| `apps/mobile/src/styles/mobileStyles.ts`               | `logoMark`, `loginButton`, 인증 관련 RN-local style    |
| `packages/ui`, `packages/ui-web`, `packages/ui-native` | Avatar/Profile 관련 public export 또는 구현 존재 여부  |

## 결론

현재 제품 표면에는 공통 `Avatar`로 추출할 반복이 부족하다. `Avatar`는 [Component API contracts](component-api-contracts.md)의 목표 계약만 유지하고, Web/Desktop 또는 Mobile 런타임 구현은 보류한다.

현재 반복되는 것은 다음에 가깝다.

| 표면                                                                           | 판단                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Web/Desktop 인증 영역의 email 텍스트                                           | 사용자 identity 텍스트 표시이며 image, initials fallback, size contract가 없다. |
| Mobile 상단 `logoMark`                                                         | 브랜드 mark다. 사람/계정 Avatar가 아니므로 Avatar primitive로 옮기지 않는다.    |
| Web/Desktop/Mobile 로그인 버튼                                                 | Button 또는 auth action 표면이다. Avatar 후보가 아니다.                         |
| `profile`, `avatar`, `photo`, `displayName`, `user_metadata.picture` 검색 결과 | 현재 앱/패키지 source에 reusable Avatar surface가 없다.                         |

따라서 다음 단계는 Avatar 구현이 아니라, 실제 profile/account 화면이나 사용자 identity UI가 생길 때 다시 판단하는 것이다.

## 구현 보류 기준

아래 조건을 만족하기 전까지 `Avatar`를 패키지 export로 추가하지 않는다.

- Web/Desktop 또는 Mobile에서 사람, 팀, 계정 같은 identity visual이 2곳 이상 반복된다.
- 반복 surface가 `name`, optional `src`, fallback initials, `size`를 같은 의미로 요구한다.
- 이미지 로딩 실패, 대체 텍스트, 접근성 label을 공통 contract로 묶을 필요가 있다.
- Web/Desktop과 Mobile 모두에서 token 기반 size, background, foreground, radius를 정할 수 있다.
- 최소 테스트로 initials fallback과 accessibility label 계약을 고정할 수 있다.

## 목표 계약 유지

목표 계약은 계속 아래 형태로 남긴다.

```tsx
<Avatar name="Koo" size="md" />
```

후속 구현이 필요해지면 최소 prop은 다음 범위를 기준으로 다시 검토한다.

| Prop   | 후보 값          | 의미                                           |
| ------ | ---------------- | ---------------------------------------------- |
| `name` | `string`         | fallback initials와 accessibility label의 원본 |
| `src`  | `string`         | 사용자 이미지 URL                              |
| `size` | `sm`, `md`, `lg` | 정사각형 크기 token 단계                       |

## 제외하는 표면

다음 표면은 Avatar 구현 근거로 보지 않는다.

- 브랜드 로고, 앱 아이콘, decorative mark
- 로그인/로그아웃 버튼처럼 identity image가 없는 auth action
- email이나 사용자 ID를 텍스트로만 보여주는 상태 표시
- 단일 화면에서만 쓰이는 임시 profile 이미지

## 후속 후보

Avatar 구현은 다음 중 하나가 생길 때 별도 티켓으로 만든다.

- account/profile 화면에서 사용자 사진 또는 initials가 필요해진다.
- 협업, 공유, 작성자 표시처럼 사용자 identity visual이 여러 화면에 반복된다.
- Web/Desktop과 Mobile이 같은 `name`/`src` fallback 규칙을 공유해야 한다.

그 전까지는 `Avatar`를 공통 API 목표 계약으로만 유지한다.
