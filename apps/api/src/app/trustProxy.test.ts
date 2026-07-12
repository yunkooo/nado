import { describe, expect, it } from "vitest";
import { readTrustProxy } from "./trustProxy.js";

describe("readTrustProxy", () => {
  it("keeps numeric hop counts numeric", () => {
    expect(readTrustProxy("1")).toBe(1);
    expect(readTrustProxy("2")).toBe(2);
    expect(readTrustProxy(" 1 ")).toBe(1);
  });

  it("supports explicit local disable and legacy development values", () => {
    expect(readTrustProxy(undefined)).toBe(false);
    expect(readTrustProxy("0")).toBe(false);
    expect(readTrustProxy("false")).toBe(false);
    expect(readTrustProxy("true")).toBe(true);
  });
});
