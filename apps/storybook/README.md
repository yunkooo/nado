# Storybook 운영 기준

`apps/storybook`은 제품 설명용 랜딩 페이지가 아니라 UI 상태를 독립적으로 확인하는 작업 공간이다. 실제 API, Auth, Supabase 연결 없이 mock 데이터로 핵심 화면 상태를 고정한다.

## 테스트 방식

선택: source contract test + Storybook build

현재 단계에서는 Storybook story를 직접 브라우저 interaction test로 실행하기보다 다음 조합을 기본 검증 단위로 사용한다.

- `storybookStructure.test.ts`: story 파일 위치, 핵심 story export, mock 경계, narrow surface 등록 여부를 소스 계약으로 검증한다.
- `pnpm --filter @nado/storybook typecheck`: Storybook 앱과 co-located UI story가 TypeScript 계약을 지키는지 확인한다.
- `pnpm --filter @nado/storybook build`: 등록된 story가 Vite/Storybook production build에서 실제로 번들링되는지 확인한다.

## 선택지 비교

Vitest addon은 Storybook 안에서 interaction을 더 직접적으로 검증하기 좋다. 다만 현재 프로젝트는 아직 Playwright/브라우저 runner를 운영하지 않고, 모든 story interaction을 자동화할 만큼 상태 수가 많지 않다. 지금 도입하면 의존성과 실행 시간이 먼저 늘어난다.

portable stories는 컴포넌트 테스트에서 story args를 재사용하기 좋다. 다만 현재 핵심 story는 Web/Desktop 앱 CSS, fullscreen shell mock, co-located package story가 섞여 있어 바로 컴포넌트 테스트 fixture로 쓰기에는 경계가 넓다. 개별 UI 컴포넌트에 JSDOM 렌더 테스트가 필요해질 때 부분 도입한다.

source contract test + Storybook build는 지금 구조에서 유지보수 비용이 가장 낮다. story가 사라지거나 핵심 상태 export가 빠지면 빠르게 실패하고, build로 실제 Storybook 등록/번들링까지 확인할 수 있다.

## 핵심 상태

- 저장 추천 chip: `Idle`, `Saving`, `SavedDisabled`
- 분석 결과 단어 popover: `WordPopoverOpen`, `NarrowTapOpen`
- 작은 화면 확인: `NarrowSidebarOpen`, `SidebarOpen`

새 UI 상태를 추가할 때는 story를 먼저 만들고, 중요한 회귀 포인트는 `storybookStructure.test.ts`에 소스 계약으로 남긴다. 실제 사용자 조작 흐름까지 자동화해야 할 만큼 위험도가 올라가면 Vitest addon 또는 portable stories 기반 테스트를 별도 이슈로 도입한다.
