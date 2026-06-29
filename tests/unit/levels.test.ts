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

  it("gives level five fewer spawns and longer reactions", () => {
    const level = getLevelConfiguration(5);
    const weightedAverage = (entries: Array<{ value: number; weight: number }>): number =>
      entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
      entries.reduce((sum, entry) => sum + entry.weight, 0);
    expect(weightedAverage(level.spawnTimesMs)).toBe(825);
    expect(weightedAverage(level.activeTimesMs)).toBe(3640);
  });

  it("increases late difficulty gradually with a playable timing floor", () => {
    const level6 = getLevelConfiguration(6);
    const level20 = getLevelConfiguration(20);
    const level1000 = getLevelConfiguration(1000);
    expect(level20.spawnTimesMs[1]!.value).toBeLessThan(level6.spawnTimesMs[1]!.value);
    expect(level1000.spawnTimesMs[0]!.value).toBeGreaterThanOrEqual(190);
    expect(level20.targets.find((entry) => entry.value === "bismarck")!.weight).toBeGreaterThan(
      level6.targets.find((entry) => entry.value === "bismarck")!.weight,
    );
  });
});
