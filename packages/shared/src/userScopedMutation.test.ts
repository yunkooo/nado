import { describe, expect, it } from "vitest";
import {
  isCurrentUserScopedRequest,
  shouldApplyUserScopedMutation,
} from "./index";

describe("shouldApplyUserScopedMutation", () => {
  it("applies a completed request only while its user remains active", () => {
    expect(shouldApplyUserScopedMutation("user-a", "user-a")).toBe(true);
    expect(shouldApplyUserScopedMutation("user-a", "user-b")).toBe(false);
    expect(shouldApplyUserScopedMutation("user-a", null)).toBe(false);
    expect(shouldApplyUserScopedMutation(null, null)).toBe(false);
  });

  it("keeps analysis results within the latest user-scoped request", () => {
    expect(isCurrentUserScopedRequest(null, null, 1, 1)).toBe(true);
    expect(isCurrentUserScopedRequest("user-a", "user-b", 1, 1)).toBe(false);
    expect(isCurrentUserScopedRequest("user-a", "user-a", 1, 2)).toBe(false);
  });
});
