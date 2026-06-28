import { describe, expect, it } from "vitest";
import { isSecondaryTouch } from "../../src/game/controls";

describe("drawing controls", () => {
  it("does not treat a mouse click as a pause gesture", () => {
    expect(isSecondaryTouch({ id: 0, wasTouch: false })).toBe(false);
  });

  it("does not treat the first finger as a pause gesture", () => {
    expect(isSecondaryTouch({ id: 1, wasTouch: true })).toBe(false);
  });

  it("uses an additional finger as a pause gesture", () => {
    expect(isSecondaryTouch({ id: 2, wasTouch: true })).toBe(true);
  });
});
