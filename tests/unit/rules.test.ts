import { describe, expect, it } from "vitest";
import { MAX_LIVES, TARGETS, scoreTargets } from "../../src/game/rules";

describe("scoring", () => {
  it("rewards grouped aardvarks by count and level", () => {
    expect(scoreTargets(0, 3, 3, [TARGETS.aardvark, TARGETS.aardvark]).deltaScore).toBe(600);
  });

  it("doubles a positive circle with a bonus", () => {
    expect(scoreTargets(0, 3, 2, [TARGETS.aardvark, TARGETS.bonus_points]).deltaScore).toBe(200);
  });

  it("lets Bismarck cancel gains, remove a life, and deduct current score", () => {
    expect(scoreTargets(1000, 3, 2, [TARGETS.aardvark, TARGETS.bismarck])).toEqual({
      score: 750,
      lives: 2,
      deltaScore: -250,
    });
  });

  it("caps extra lives", () => {
    expect(scoreTargets(0, MAX_LIVES, 1, [TARGETS.life]).lives).toBe(MAX_LIVES);
  });
});
