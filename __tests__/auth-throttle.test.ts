import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailures,
  lockedFor,
  recordFailure,
  resetThrottle,
} from "@/lib/auth/throttle";

describe("login throttle", () => {
  beforeEach(() => resetThrottle());

  it("does not lock before the failure limit", () => {
    for (let i = 0; i < 7; i++) recordFailure("a@b.com");
    expect(lockedFor("a@b.com")).toBe(0);
  });

  it("locks after 8 consecutive failures", () => {
    for (let i = 0; i < 8; i++) recordFailure("a@b.com");
    expect(lockedFor("a@b.com")).toBeGreaterThan(0);
  });

  it("tracks each key independently", () => {
    for (let i = 0; i < 8; i++) recordFailure("a@b.com");
    expect(lockedFor("outro@b.com")).toBe(0);
  });

  it("clears failures on successful login", () => {
    for (let i = 0; i < 7; i++) recordFailure("a@b.com");
    clearFailures("a@b.com");
    recordFailure("a@b.com");
    expect(lockedFor("a@b.com")).toBe(0);
  });
});
