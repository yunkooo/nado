# `@nado/core` 도입 기준 검토

검토일: 2026-06-29

## 결론

`@nado/core`는 지금 만들지 않는다.

현재 Web/Desktop/Mobile에는 비슷한 runtime 코드가 있지만, 대부분은 제품 도메인 흐름이거나 플랫폼 adapter 차이가 큰 코드다. 이 단계에서 `packages/core`를 만들면 실제 책임이 좁혀진 공통 패키지가 아니라 "나중에 뭔가 넣을 곳"이 될 가능성이 크다.

## 현재 패키지 경계

| 패키지            | 현재 책임                                          | `@nado/core`와의 경계                                          |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `@nado/shared`    | API schema, domain type, validation, business rule | 도메인 계약은 계속 shared에 둔다.                              |
| `@nado/tokens`    | design token source와 platform adapter             | 디자인 값과 RN token 변환은 core로 옮기지 않는다.              |
| `@nado/ui-web`    | Web/Desktop DOM component 구현                     | DOM/CSS 구현은 core가 아니라 UI 구현 패키지 책임이다.          |
| `@nado/ui-native` | React Native primitive 구현                        | RN `Pressable`, `Text`, `View`, `StyleSheet` 구현은 여기 둔다. |
| App packages      | env, auth, transport, screen state                 | 플랫폼별 runtime 차이가 남아 있는 동안 앱 안에 둔다.           |

`@nado/core`는 도메인 계약도 아니고 UI 구현도 아닌, 앱 실행을 돕는 platform-neutral runtime utility가 충분히 반복될 때만 만든다.

## 후보 점검

| 후보                               | 확인한 파일                                                                                                             | 판단                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| API URL/config                     | `apps/web/src/lib/apiClient.ts`, `apps/desktop/src/api/apiConfig.ts`, `apps/mobile/src/api/apiConfig.ts`                | 보류. Next relative API, Tauri production URL, Expo emulator URL이 다르다.                                         |
| API fetch/transport                | `apps/web/src/lib/apiClient.ts`, `apps/desktop/src/api/apiFetch.ts`, `apps/mobile/src/api/*.ts`                         | 보류. Web은 timeout wrapper, Desktop은 Tauri HTTP plugin, Mobile은 Expo/RN fetch와 configuration error를 쓴다.     |
| API response helpers               | Web/Desktop/Mobile의 `readJson`, `readErrorMessage`, `createAuthHeaders`                                                | 일부 정리. error message reader는 `@nado/shared` API error contract로 모으고, `readJson`과 auth header는 보류한다. |
| Supabase auth client               | `apps/web/src/features/auth/authClient.ts`, `apps/desktop/src/auth/authClient.ts`, `apps/mobile/src/auth/authClient.ts` | 보류. browser hash, Tauri PKCE/deep link, RN AsyncStorage/Linking이 분리된다.                                      |
| Auth state hook                    | `apps/web/src/features/auth/authState.ts`, `apps/desktop/src/auth/authState.ts`, `apps/mobile/src/auth/authState.ts`    | 보류. session refresh, URL callback, Linking subscription 차이가 있다.                                             |
| Analysis page state store          | `apps/web/src/features/analysis/analysisState.ts`, `apps/desktop/src/features/analysis/analysisState.ts`                | 보류. 제품 화면 상태이며 storage key와 reset/persist 정책이 앱별로 다르다.                                         |
| Vocabulary realtime/manual refresh | `@nado/shared`, Web/Desktop vocabulary state, Mobile vocabulary state                                                   | `@nado/shared` 유지. refresh timing과 topic 생성은 이미 domain rule로 공유한다.                                    |
| i18n/theme/storage abstraction     | 현재 dedicated 공통 구현 없음                                                                                           | 후보 부족. 반복된 API contract가 생긴 뒤 다시 판단한다.                                                            |

## `@nado/shared`에 남겨야 하는 것

다음은 플랫폼 runtime utility가 아니라 제품 계약이다. `@nado/core`가 생겨도 옮기지 않는다.

- 분석 요청/응답 schema
- 분석 model id와 입력 validation
- 단어장 item, 저장 요청, list response schema
- vocabulary pagination과 realtime refresh timing
- 제품 도메인 error detail reader

이 값들은 API server, Web, Desktop, Mobile이 같은 제품 규칙을 따라야 하므로 `@nado/shared`에 남기는 편이 맞다.

## 첫 후보가 생긴다면

첫 후보는 "공통 API client 전체"가 아니라 작은 API response helper contract가 적당하다.

후보 contract:

```ts
type ApiTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type ApiResult<TSuccess, TError> =
  | { data: TSuccess; status: "success" }
  | ({ status: "error" } & TError);
```

첫 PR 범위는 다음처럼 작게 잡는다.

- `readJson`, `readApiErrorMessage`, `createAuthHeaders`처럼 transport와 무관한 helper만 후보로 둔다.
- Web/Desktop/Mobile 중 2개 이상에서 실제 삭제되는 중복이 있어야 한다.
- Tauri fetch, Expo base URL, timeout, Supabase auth client 생성은 앱별 adapter로 남긴다.
- 새 package를 만들기 전에 한 앱 안에서 helper shape를 먼저 검증한다.

2026-06-29 spike 결과:

- `readApiErrorMessage`는 새 `@nado/core`가 아니라 `@nado/shared`의 API error response contract로 모은다.
- Web/Desktop/Mobile vocabulary client의 app-local error message reader는 제거한다.
- `readJson`은 여전히 Web/Desktop/Mobile API client에 반복되지만, 함수 크기가 작고 fetch/timeout/base URL adapter 차이가 커서 아직 package 생성 이득이 작다.
- `createAuthHeaders`는 vocabulary와 analysis의 optional auth, content type, platform adapter 차이가 있어 앱별 helper 또는 inline object로 유지한다.

## 생성 조건

아래 조건이 모두 충족될 때만 `packages/core` 생성을 검토한다.

- 같은 helper가 Web/Desktop/Mobile 중 2개 이상에서 실제로 반복된다.
- helper가 `@nado/shared`의 도메인 schema가 아니다.
- helper가 DOM, Tauri, Expo, React Native API를 직접 import하지 않는다.
- package를 만들면 앱 코드가 줄고 테스트 경계가 더 명확해진다.
- 첫 PR에서 제거할 app-local 중복과 새 테스트 범위를 같이 제시할 수 있다.

## 제외 범위

이 검토는 package 생성 전 기준을 정리하는 문서다. 이번 단계에서는 다음을 하지 않는다.

- `packages/core` 생성
- API client migration
- Supabase auth client 공통화
- storage abstraction 도입
- i18n/theme provider 생성
- Web/Desktop/Mobile hook 이동

## 다음 행동

당장은 `@nado/core`를 만들지 않는다. API error message 중복은 `@nado/shared`로 줄였고, 남은 helper는 package 생성 비용보다 adapter 차이가 크다.

다음 재검토 조건:

1. Web/Desktop/Mobile 중 2개 이상에서 `readJson` 이상의 response normalization 중복이 다시 커진다.
2. helper가 `@nado/shared`의 API/domain contract가 아니라 순수 runtime utility로 분리된다.
3. 첫 PR에서 app-local helper 삭제와 package test를 함께 제시할 수 있다.
4. Supabase auth와 screen state는 플랫폼 차이가 줄어들기 전까지 앱별 구현으로 유지한다.
