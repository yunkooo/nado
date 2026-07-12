/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DesktopShellView } from "./DesktopShellView";

afterEach(cleanup);

describe("DesktopShellView", () => {
  it("marks the active navigation item and labels the current workspace", () => {
    render(
      <DesktopShellView
        activeItem="vocabulary"
        authControls={<button type="button">로그아웃</button>}
        isSidebarOpen={false}
        onCloseSidebar={vi.fn()}
        onOpenSidebar={vi.fn()}
        onSelectNavigationItem={vi.fn()}
        workspaceLabel="단어장 화면"
      >
        <p>단어장 내용</p>
      </DesktopShellView>,
    );

    expect(
      screen
        .getByRole("button", { name: "단어장" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("region", { name: "단어장 화면" }).textContent,
    ).toContain("단어장 내용");
  });

  it("forwards sidebar and navigation interactions", () => {
    const onCloseSidebar = vi.fn();
    const onOpenSidebar = vi.fn();
    const onSelectNavigationItem = vi.fn();
    const { rerender } = render(
      <DesktopShellView
        activeItem="analysis"
        authControls={null}
        isSidebarOpen={false}
        onCloseSidebar={onCloseSidebar}
        onOpenSidebar={onOpenSidebar}
        onSelectNavigationItem={onSelectNavigationItem}
        workspaceLabel="분석 화면"
      >
        분석 내용
      </DesktopShellView>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "복습" }));

    expect(onOpenSidebar).toHaveBeenCalledOnce();
    expect(onSelectNavigationItem).toHaveBeenCalledWith("review");

    rerender(
      <DesktopShellView
        activeItem="analysis"
        authControls={null}
        isSidebarOpen
        onCloseSidebar={onCloseSidebar}
        onOpenSidebar={onOpenSidebar}
        onSelectNavigationItem={onSelectNavigationItem}
        workspaceLabel="분석 화면"
      >
        분석 내용
      </DesktopShellView>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 배경 닫기" }));

    expect(onCloseSidebar).toHaveBeenCalledOnce();
  });

  it("isolates the workspace while the sidebar drawer is open", () => {
    const { container } = render(
      <DesktopShellView
        activeItem="analysis"
        authControls={<button type="button">로그아웃</button>}
        isSidebarOpen
        onCloseSidebar={vi.fn()}
        onOpenSidebar={vi.fn()}
        onSelectNavigationItem={vi.fn()}
        workspaceLabel="분석 화면"
      >
        <button type="button">분석 실행</button>
      </DesktopShellView>,
    );

    const sidebar = screen.getByRole("dialog", { name: "앱 정보" });
    const workspace = container.querySelector(".desktop-workspace");

    expect(sidebar.getAttribute("aria-modal")).toBe("true");
    expect(workspace?.getAttribute("aria-hidden")).toBe("true");
    expect(workspace?.getAttribute("aria-label")).toBe("분석 화면");
    expect(workspace?.hasAttribute("inert")).toBe(true);
  });
});
