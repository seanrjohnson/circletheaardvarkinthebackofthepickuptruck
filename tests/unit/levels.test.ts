import { describe, expect, it } from "vitest";
import { getLevelConfiguration, weightedPick } from "../../src/game/levels";

describe("level configuration", () => {
  it("introduces disguises and powerups at the original levels", () => {
    expect(getLevelConfiguration(1).targets.map((entry) => entry.value)).toEqual([
      "aardvark",
      "bismarck",
    ]);
    expect(getLevelConfiguration(3).targets.map((entry) => entry.value)).toContain("aardmarck");
    expect(getLevelConfiguration(5).targets.map((entry) => entry.value)).toContain("life");
  });

  it("selects weighted boundary values deterministically", () => {
    const values = [
      { value: "a", weight: 3 },
      { value: "b", weight: 1 },
    ];
    expect(weightedPick(values, () => 0)).toBe("a");
    expect(weightedPick(values, () => 0.99)).toBe("b");
  });

  it("keeps high-level timing positive", () => {
    expect(
      Math.min(...getLevelConfiguration(1000).spawnTimesMs.map((entry) => entry.value)),
    ).toBeGreaterThan(0);
  });
});
