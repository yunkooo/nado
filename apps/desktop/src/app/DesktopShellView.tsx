import type { ReactNode, Ref } from "react";

export type DesktopSurfaceKey = "analysis" | "review" | "vocabulary";

export interface DesktopShellViewProps {
  activeItem: DesktopSurfaceKey;
  authControls: ReactNode;
  children: ReactNode;
  closeButtonRef?: Ref<HTMLButtonElement>;
  isSidebarOpen: boolean;
  menuButtonRef?: Ref<HTMLButtonElement>;
  onCloseSidebar: () => void;
  onOpenSidebar: () => void;
  onSelectNavigationItem: (item: DesktopSurfaceKey) => void;
  sidebarRef?: Ref<HTMLElement>;
  workspaceLabel: string;
}

const navigationItems: { key: DesktopSurfaceKey; label: string }[] = [
  { key: "analysis", label: "분석" },
  { key: "vocabulary", label: "단어장" },
  { key: "review", label: "복습" },
];

export function DesktopShellView({
  activeItem,
  authControls,
  children,
  closeButtonRef,
  isSidebarOpen,
  menuButtonRef,
  onCloseSidebar,
  onOpenSidebar,
  onSelectNavigationItem,
  sidebarRef,
  workspaceLabel,
}: DesktopShellViewProps) {
  return (
    <main className="desktop-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="desktop-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="desktop-mobile-menu-button"
          onClick={onOpenSidebar}
          ref={menuButtonRef}
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
          onClick={onCloseSidebar}
          type="button"
        />
      ) : null}
      <aside
        aria-label="앱 정보"
        aria-modal={isSidebarOpen ? true : undefined}
        className={[
          "desktop-sidebar",
          isSidebarOpen ? "desktop-sidebar--open" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        id="desktop-sidebar"
        ref={sidebarRef}
        role={isSidebarOpen ? "dialog" : undefined}
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
              onClick={onCloseSidebar}
              ref={closeButtonRef}
              type="button"
            >
              <span className="desktop-sidebar-close__bar" />
              <span className="desktop-sidebar-close__bar" />
            </button>
          </div>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {navigationItems.map((item) => {
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
                  onClick={() => onSelectNavigationItem(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <footer className="desktop-sidebar__footer">{authControls}</footer>
      </aside>

      <section
        aria-hidden={isSidebarOpen ? true : undefined}
        aria-label={workspaceLabel}
        className="desktop-workspace"
        inert={isSidebarOpen ? true : undefined}
      >
        {children}
      </section>
    </main>
  );
}
