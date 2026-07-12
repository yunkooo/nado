import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Button, VocabularyItemCard } from "@nado/ui";
import {
  DesktopShellView,
  type DesktopSurfaceKey,
} from "../../desktop/src/app/DesktopShellView";
import "../../desktop/src/styles/styles.css";

interface DesktopShellStoryProps {
  activeItem: DesktopSurfaceKey;
  children: ReactNode;
  initialSidebarOpen?: boolean;
  workspaceLabel: string;
}

function DesktopAuthMock() {
  return (
    <div className="desktop-auth-controls" aria-label="로그인 상태">
      <span className="desktop-auth-controls__user">mock.user@nado.dev</span>
      <p className="desktop-auth-controls__message">Storybook mock session</p>
    </div>
  );
}

function DesktopShellStory({
  activeItem,
  children,
  initialSidebarOpen = false,
  workspaceLabel,
}: DesktopShellStoryProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);

  return (
    <DesktopShellView
      activeItem={activeItem}
      authControls={<DesktopAuthMock />}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      onSelectNavigationItem={() => setIsSidebarOpen(false)}
      workspaceLabel={workspaceLabel}
    >
      {children}
    </DesktopShellView>
  );
}

function DesktopAnalysisPlaceholder() {
  return (
    <DesktopShellStory activeItem="analysis" workspaceLabel="분석 화면">
      <section className="desktop-analysis-workspace">
        <div className="desktop-analysis-page">
          <section className="desktop-analysis-status">
            분석 결과가 들어오기 전의 Desktop shell 상태입니다.
          </section>
        </div>
      </section>
    </DesktopShellStory>
  );
}

function DesktopVocabularySurface() {
  return (
    <DesktopShellStory activeItem="vocabulary" workspaceLabel="단어장 화면">
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
              <VocabularyItemCard
                deletingMeaningKeys={new Set()}
                item={{
                  createdAt: "2026-07-10T00:00:00.000Z",
                  id: "storybook-shipping",
                  meanings: [
                    {
                      meaning: "출시/배포",
                      note: "제품을 사용자에게 배포하거나 출시하는 일을 말합니다.",
                    },
                  ],
                  term: "shipping",
                  type: "word",
                  updatedAt: "2026-07-11T00:00:00.000Z",
                }}
                onDeleteMeaning={() => undefined}
              />
              <VocabularyItemCard
                deletingMeaningKeys={new Set()}
                item={{
                  createdAt: "2026-07-09T00:00:00.000Z",
                  id: "storybook-framework",
                  meanings: [
                    {
                      meaning: "프레임워크",
                      note: "앱을 만들 때 기반이 되는 개발 도구나 구조를 뜻합니다.",
                    },
                  ],
                  term: "framework",
                  type: "word",
                  updatedAt: "2026-07-10T00:00:00.000Z",
                }}
                onDeleteMeaning={() => undefined}
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
    </DesktopShellStory>
  );
}

function DesktopReviewCardMock() {
  return (
    <article className="nado-review-card">
      <span className="nado-eyebrow">My flashcard</span>
      <span className="nado-review-card__meta">1 / 6</span>
      <h2>shipping</h2>
      <p className="nado-review-card__answer nado-review-card__answer--revealed">
        출시/배포
      </p>
      <p className="nado-review-card__note">
        The team improved shipping speed.
      </p>
    </article>
  );
}

function DesktopReviewSurface({
  isSidebarOpen = false,
}: {
  isSidebarOpen?: boolean;
}) {
  return (
    <DesktopShellStory
      activeItem="review"
      initialSidebarOpen={isSidebarOpen}
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
            <DesktopReviewCardMock />
            <div className="nado-review-actions">
              <Button variant="secondary">다시 보기</Button>
              <Button>다음 카드</Button>
            </div>
          </section>
        </div>
      </section>
    </DesktopShellStory>
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
  globals: {
    viewport: {
      value: "mobile1",
    },
  },
  render: () => <DesktopReviewSurface isSidebarOpen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByRole("button", {
      name: "사이드바 닫기",
    });

    await expect(closeButton).toBeVisible();
    await userEvent.click(closeButton);
    await expect(
      canvas.getByRole("button", { name: "사이드바 열기" }),
    ).toBeVisible();
  },
};

export const VocabularySurface: Story = {
  render: () => <DesktopVocabularySurface />,
};

export const ReviewSurface: Story = {
  render: () => <DesktopReviewSurface />,
};
