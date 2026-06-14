import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Button, ReviewCard, VocabularyListItem } from "@nado/ui";
import "../../desktop/src/styles/styles.css";

type DesktopSurfaceKey = "analysis" | "review" | "vocabulary";

interface DesktopShellMockProps {
  activeItem: DesktopSurfaceKey;
  children: ReactNode;
  isSidebarOpen?: boolean;
  workspaceLabel: string;
}

const desktopNavigationItems: {
  key: DesktopSurfaceKey;
  label: string;
}[] = [
  { key: "analysis", label: "분석" },
  { key: "vocabulary", label: "단어장" },
  { key: "review", label: "복습" },
];

function DesktopAuthMock() {
  return (
    <div className="desktop-auth-controls" aria-label="로그인 상태">
      <span className="desktop-auth-controls__user">mock.user@nado.dev</span>
      <p className="desktop-auth-controls__message">Storybook mock session</p>
    </div>
  );
}

function DesktopShellMock({
  activeItem,
  children,
  isSidebarOpen = false,
  workspaceLabel,
}: DesktopShellMockProps) {
  return (
    <main className="desktop-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="desktop-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="desktop-mobile-menu-button"
          type="button"
        >
          <span className="desktop-mobile-menu-button__bar" />
          <span className="desktop-mobile-menu-button__bar" />
          <span className="desktop-mobile-menu-button__bar" />
        </button>
      ) : null}
      {isSidebarOpen ? (
        <button
          aria-label="사이드바 배경 닫기"
          className="desktop-sidebar-scrim"
          type="button"
        />
      ) : null}
      <aside
        aria-label="앱 정보"
        className={[
          "desktop-sidebar",
          isSidebarOpen ? "desktop-sidebar--open" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        id="desktop-sidebar"
      >
        <div>
          <div className="desktop-brand">
            <span className="desktop-brand__mark" aria-hidden="true">
              n
            </span>
            <strong className="desktop-brand__name">nado</strong>
            <button
              aria-label="사이드바 닫기"
              className="desktop-sidebar-close"
              type="button"
            >
              <span className="desktop-sidebar-close__bar" />
              <span className="desktop-sidebar-close__bar" />
            </button>
          </div>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {desktopNavigationItems.map((item) => {
              const isActive = item.key === activeItem;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "desktop-nav__item",
                    isActive ? "desktop-nav__item--active" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.key}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <footer className="desktop-sidebar__footer">
          <DesktopAuthMock />
        </footer>
      </aside>

      <section className="desktop-workspace" aria-label={workspaceLabel}>
        {children}
      </section>
    </main>
  );
}

function DesktopAnalysisPlaceholder() {
  return (
    <DesktopShellMock activeItem="analysis" workspaceLabel="분석 화면">
      <section className="desktop-analysis-workspace">
        <div className="desktop-analysis-page">
          <section className="desktop-analysis-status">
            분석 결과가 들어오기 전의 Desktop shell 상태입니다.
          </section>
        </div>
      </section>
    </DesktopShellMock>
  );
}

function DesktopVocabularySurface() {
  return (
    <DesktopShellMock activeItem="vocabulary" workspaceLabel="단어장 화면">
      <section className="desktop-content-workspace">
        <div className="desktop-page">
          <header className="desktop-page-header">
            <div>
              <p className="nado-eyebrow">Vocabulary</p>
              <h1 className="desktop-page-title">단어장</h1>
            </div>
            <div className="nado-vocabulary-refresh">
              <button className="nado-vocabulary-refresh__button" type="button">
                새로고침
              </button>
              <p className="nado-vocabulary-refresh__message">
                mock 동기화 완료
              </p>
            </div>
          </header>
          <section className="nado-vocabulary-summary">
            <div className="nado-vocabulary-summary__item">
              <span>저장한 단어</span>
              <strong>24</strong>
            </div>
            <div className="nado-vocabulary-summary__item">
              <span>오늘 복습</span>
              <strong>6</strong>
            </div>
          </section>
          <section className="nado-vocabulary-list-wrap">
            <div className="nado-section-header">
              <div>
                <span>최근 저장</span>
                <h2>분석 결과에서 저장한 표현</h2>
              </div>
            </div>
            <div className="nado-vocabulary-list">
              <VocabularyListItem
                context="제품을 사용자에게 배포하거나 출시하는 일을 말합니다."
                meaning="출시/배포"
                meta="명사"
                term="shipping"
              />
              <VocabularyListItem
                context="앱을 만들 때 기반이 되는 개발 도구나 구조를 뜻합니다."
                meaning="프레임워크"
                meta="명사"
                term="framework"
              />
            </div>
            <nav
              className="nado-vocabulary-pagination"
              aria-label="단어장 페이지"
            >
              <span>1 / 4</span>
              <div className="nado-vocabulary-pagination__actions">
                <Button variant="secondary">이전</Button>
                <Button>다음</Button>
              </div>
            </nav>
          </section>
        </div>
      </section>
    </DesktopShellMock>
  );
}

function DesktopReviewSurface({
  isSidebarOpen = false,
}: {
  isSidebarOpen?: boolean;
}) {
  return (
    <DesktopShellMock
      activeItem="review"
      isSidebarOpen={isSidebarOpen}
      workspaceLabel="복습 화면"
    >
      <section className="desktop-content-workspace">
        <div className="desktop-page">
          <header className="desktop-page-header">
            <div>
              <p className="nado-eyebrow">Review</p>
              <h1 className="desktop-page-title">복습</h1>
            </div>
            <div className="nado-vocabulary-refresh">
              <button className="nado-vocabulary-refresh__button" type="button">
                단어장 동기화
              </button>
              <p className="nado-vocabulary-refresh__message">
                6개 카드 준비됨
              </p>
            </div>
          </header>
          <section className="nado-review-layout">
            <div className="nado-review-controls">
              <button
                className="nado-review-direction nado-review-direction--active"
                type="button"
              >
                영어 → 한국어
              </button>
              <button className="nado-review-direction" type="button">
                한국어 → 영어
              </button>
            </div>
            <ReviewCard
              answer="출시/배포"
              example="The team improved shipping speed."
              isRevealed
              prompt="shipping"
            />
            <div className="nado-review-actions">
              <Button variant="secondary">다시 보기</Button>
              <Button>다음 카드</Button>
            </div>
          </section>
        </div>
      </section>
    </DesktopShellMock>
  );
}

const meta = {
  parameters: {
    layout: "fullscreen",
  },
  title: "Desktop/Surface",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SidebarClosed: Story = {
  render: () => <DesktopAnalysisPlaceholder />,
};

export const SidebarOpen: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => <DesktopReviewSurface isSidebarOpen />,
};

export const VocabularySurface: Story = {
  render: () => <DesktopVocabularySurface />,
};

export const ReviewSurface: Story = {
  render: () => <DesktopReviewSurface />,
};
