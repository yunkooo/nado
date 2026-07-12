# Storybook 운영 기준

`apps/storybook`은 제품 설명용 랜딩 페이지가 아니라 UI 상태를 독립적으로 확인하는 작업 공간이다. 실제 API, Auth, Supabase 연결 없이 mock 데이터로 핵심 화면 상태를 고정한다.

## 검증 명령

검증 범위: source contract test + browser story test + typecheck + Storybook build

Storybook은 구조, 실제 렌더링과 interaction, production build를 서로 다른 검증으로 나눠 운영한다.

아래 네 명령이 Storybook 검증 명령의 단일 원본이다. 다른 문서에서는 명령을 복사하지 않고 이 절을 링크한다.

- `pnpm --filter @nado/storybook test`: story 파일 위치, 핵심 export, mock 경계처럼 브라우저가 필요 없는 구조 계약을 빠르게 검증한다.
- `pnpm --filter @nado/storybook test:stories`: Playwright Chromium에서 모든 story를 렌더링하고, `play` interaction과 접근성 검사를 실행한다.
- `pnpm --filter @nado/storybook typecheck`: Storybook 앱과 co-located UI story가 TypeScript 계약을 지키는지 확인한다.
- `pnpm --filter @nado/storybook build`: 등록된 story가 Vite/Storybook production build에서 실제로 번들링되는지 확인한다.

브라우저 테스트는 모든 story의 smoke render를 기본으로 실행한다. 저장 버튼, popover, 좁은 화면 sidebar처럼 사용자 조작이 중요한 상태에는 `play`를 추가하고, `@storybook/addon-a11y` 위반은 테스트 실패로 처리한다.

portable stories는 별도 컴포넌트 테스트에서 story args를 재사용해야 할 때 부분적으로 도입한다. 현재는 Storybook Vitest addon이 실제 브라우저 검증을 담당한다.

## 번들 경고 기준

Storybook production build의 framework `chunkSizeWarningLimit`은 `1,200KB`다. 이 값은 Storybook framework, docs, accessibility, Vitest addon이 함께 들어가는 개발 도구용 preview bundle의 진단 기준이다. `build` 명령은 생성 후 별도 예산 검사도 실행한다.

기본 `500KB` 경고를 없앤 것이 실제 bundle을 `500KB` 아래로 줄였다는 뜻은 아니다. `1,200KB` 기준도 제품 Web/Desktop bundle의 성능 예산으로 사용하지 않는다. build 후 검사는 하위 폴더까지 재귀적으로 확인하고 성격별 예산을 적용한다.

| 청크 종류         | 상한      | 의미                                      |
| ----------------- | --------- | ----------------------------------------- |
| 제품 story entry  | `100KB`   | 각 `*.stories.tsx`에서 만들어진 진입 청크 |
| 제품 공통 청크    | `150KB`   | 여러 story가 공유하는 Nado 코드           |
| Preview framework | `1,200KB` | iframe, docs renderer, a11y runtime       |
| Manager runtime   | `3,300KB` | Storybook이 제공하는 prebuilt manager     |
| Addon manager     | `600KB`   | docs, a11y, Vitest manager addon          |

Manager의 큰 prebuilt runtime을 제품 코드와 섞어 평가하지 않되, 각 범주에서 기준을 넘으면 build를 실패시킨다. 제품 앱 bundle은 각 앱 build 결과에서 별도로 측정한다.

framework나 addon을 추가할 때는 필요성을 검토하고 build 결과를 남긴다. 제품 story 자체의 큰 의존성이 원인이라면 dynamic import 또는 의존성 경계를 검토하되, Storybook 내부 vendor chunk만 줄이기 위해 제품 코드를 복잡하게 만들지 않는다.

## 테스트 작성 기준

- 상태를 고정해서 보여주기만 하면 args 기반 story로 작성한다.
- 클릭, 입력, 열기/닫기 결과가 계약이면 해당 story에 `play`를 작성한다.
- 구조 테스트는 export 이름, 명령, 설정처럼 안정적인 계약만 확인한다. 설명 문장 전체를 비교하지 않는다.
- 실제 API, Auth, Supabase 대신 mock과 순수 shell view를 사용한다.

## 핵심 상태

- 저장 추천 chip: `Idle`, `Saving`, `SavedDisabled`
- 분석 결과 단어 popover: `WordPopoverOpen`, `NarrowTapOpen`
- 작은 화면 확인: `NarrowSidebarOpen`, `SidebarOpen`

## PR checklist

UI/Storybook 변경 PR에서는 PR checklist의 Storybook 항목을 확인한다. story만 바꾼 경우에도 이 문서의 네 검증 명령 결과를 PR 본문에 남긴다.

CI에서는 Playwright를 설치한 뒤 `test:stories`를 실행한다. 로컬 최초 실행에서 Chromium이 없으면 `pnpm e2e:install`을 먼저 실행한다.
