import { describe, expect, it } from "vitest";
import { RoundModel } from "../../src/game/model";

describe("round model", () => {
  it("moves a target through spawn, active, timeout, and removal", () => {
    const model = new RoundModel(1, () => 0);
    expect(model.update(499)).toEqual([]);
    expect(model.update(1)[0]?.type).toBe("spawned");
    expect(model.slots[0]?.state).toBe("spawn");
    expect(model.update(500).some((event) => event.type === "activated")).toBe(true);
    expect(model.slots[0]?.state).toBe("active");
    expect(model.update(1000).some((event) => event.type === "timedout")).toBe(true);
    expect(model.slots[0]?.state).toBe("timedout");
    expect(model.update(350).some((event) => event.type === "removed")).toBe(true);
    expect(model.slots[0]?.target).toBeUndefined();
  });

  it("circles only active targets inside the lasso", () => {
    const model = new RoundModel(1, () => 0);
    model.update(500);
    model.update(500);
    const targets = model.circle([
      { x: 50, y: 40 },
      { x: 150, y: 40 },
      { x: 150, y: 140 },
      { x: 50, y: 140 },
      { x: 50, y: 40 },
    ]);
    expect(targets.map((target) => target.type)).toEqual(["aardvark"]);
    expect(model.slots[0]?.state).toBe("circled");
  });
});
