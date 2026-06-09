"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AuthControls } from "./AuthControls";

type NavigationItem = {
  href: string;
  key: "analysis" | "review" | "vocabulary";
  label: string;
};

type AppShellProps = {
  activeItem: NavigationItem["key"];
  children: ReactNode;
  workspaceLabel: string;
};

const navigationItems: NavigationItem[] = [
  { href: "/", key: "analysis", label: "분석" },
  { href: "/vocabulary", key: "vocabulary", label: "단어장" },
  { href: "/review", key: "review", label: "복습" },
];

export function AppShell({
  activeItem,
  children,
  workspaceLabel,
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <main className="nado-app-shell">
      {!isSidebarOpen ? (
        <button
          aria-controls="nado-sidebar"
          aria-expanded="false"
          aria-label="사이드바 열기"
          className="nado-mobile-menu-button"
          onClick={() => setIsSidebarOpen(true)}
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
          onClick={closeSidebar}
          type="button"
        />
      ) : null}
      <aside
        aria-label="주요 화면"
        className={["nado-sidebar", isSidebarOpen ? "nado-sidebar--open" : null]
          .filter(Boolean)
          .join(" ")}
        id="nado-sidebar"
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
              onClick={closeSidebar}
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
                <a
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "nado-nav__item",
                    isActive ? "nado-nav__item--active" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.key}
                  onClick={closeSidebar}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <footer className="nado-sidebar__footer">
          <AuthControls />
        </footer>
      </aside>

      <section className="nado-workspace" aria-label={workspaceLabel}>
        {children}
      </section>
    </main>
  );
}
