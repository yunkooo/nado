import type { ElementType, ReactNode, Ref } from "react";

export type AppShellNavigationKey = "analysis" | "review" | "vocabulary";

type AppShellNavigationItem = {
  href: string;
  key: AppShellNavigationKey;
  label: string;
};

export type AppShellLinkProps = {
  "aria-current"?: "page";
  children: ReactNode;
  className: string;
  href: string;
  onClick: () => void;
};

export interface AppShellViewProps {
  activeItem: AppShellNavigationKey;
  authControls: ReactNode;
  children: ReactNode;
  closeButtonRef?: Ref<HTMLButtonElement>;
  isSidebarOpen: boolean;
  linkComponent?: ElementType<AppShellLinkProps>;
  menuButtonRef?: Ref<HTMLButtonElement>;
  onCloseSidebar: () => void;
  onOpenSidebar: () => void;
  sidebarRef?: Ref<HTMLElement>;
  workspaceLabel: string;
}

const navigationItems: AppShellNavigationItem[] = [
  { href: "/", key: "analysis", label: "분석" },
  { href: "/vocabulary", key: "vocabulary", label: "단어장" },
  { href: "/review", key: "review", label: "복습" },
];

export function AppShellView({
  activeItem,
  authControls,
  children,
  closeButtonRef,
  isSidebarOpen,
  linkComponent,
  menuButtonRef,
  onCloseSidebar,
  onOpenSidebar,
  sidebarRef,
  workspaceLabel,
}: AppShellViewProps) {
  const NavigationLink = linkComponent ?? "a";

  return (
    <main className="nado-app-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="nado-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="nado-mobile-menu-button"
          onClick={onOpenSidebar}
          ref={menuButtonRef}
          type="button"
        >
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
          <span className="nado-mobile-menu-button__bar" />
        </button>
      ) : null}
      {isSidebarOpen ? (
        <button
          aria-label="사이드바 배경 닫기"
          className="nado-sidebar-scrim"
          onClick={onCloseSidebar}
          type="button"
        />
      ) : null}
      <aside
        aria-label="주요 화면"
        aria-modal={isSidebarOpen ? true : undefined}
        className={["nado-sidebar", isSidebarOpen ? "nado-sidebar--open" : null]
          .filter(Boolean)
          .join(" ")}
        id="nado-sidebar"
        ref={sidebarRef}
        role={isSidebarOpen ? "dialog" : undefined}
      >
        <div className="nado-sidebar__main">
          <header className="nado-sidebar__header">
            <div className="nado-brand">
              <span className="nado-brand__mark" aria-hidden="true">
                n
              </span>
              <strong className="nado-brand__name">nado</strong>
            </div>
            <button
              aria-label="사이드바 닫기"
              className="nado-sidebar-close"
              onClick={onCloseSidebar}
              ref={closeButtonRef}
              type="button"
            >
              <span className="nado-sidebar-close__bar" />
              <span className="nado-sidebar-close__bar" />
            </button>
          </header>
          <nav className="nado-nav" aria-label="주요 메뉴">
            {navigationItems.map((item) => {
              const isActive = item.key === activeItem;

              return (
                <NavigationLink
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "nado-nav__item",
                    isActive ? "nado-nav__item--active" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={item.href}
                  key={item.key}
                  onClick={onCloseSidebar}
                >
                  {item.label}
                </NavigationLink>
              );
            })}
          </nav>
        </div>
        <footer className="nado-sidebar__footer">{authControls}</footer>
      </aside>

      <section
        aria-hidden={isSidebarOpen ? true : undefined}
        aria-label={workspaceLabel}
        className="nado-workspace"
        inert={isSidebarOpen ? true : undefined}
      >
        {children}
      </section>
    </main>
  );
}
