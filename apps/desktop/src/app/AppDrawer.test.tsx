/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../auth/AuthControls", () => ({
  AuthControls: () => <button type="button">로그아웃</button>,
}));
vi.mock("../features/analysis/AnalysisFlow", () => ({
  AnalysisFlow: () => <button type="button">분석 실행</button>,
}));
vi.mock("./AppDataSync", () => ({
  AppDataSync: () => null,
}));
vi.mock("./StudyWorkspace", () => ({
  StudyWorkspace: () => null,
}));

import { App } from "./App";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("Desktop drawer interaction", () => {
  it("traps focus, locks scrolling, and restores focus after closing", () => {
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
      {} as DOMRect,
    ] as unknown as DOMRectList);

    render(<App />);

    const menuButton = screen.getByRole("button", {
      name: "사이드바 열기",
    });
    menuButton.focus();
    fireEvent.click(menuButton);

    const closeButton = screen.getByRole("button", {
      name: "사이드바 닫기",
    });
    const logoutButton = screen.getByRole("button", { name: "로그아웃" });

    expect(document.activeElement).toBe(closeButton);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(logoutButton);

    fireEvent.click(screen.getByRole("button", { name: "사이드바 배경 닫기" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "사이드바 열기" }),
    );
    expect(document.body.style.overflow).toBe("");
  }, 10_000);
});
