import { describe, expect, it } from "vitest";
import {
  MAX_LIVES,
  TARGETS,
  isRecoveryRound,
  missesRequiredForLifeLoss,
  scoreTargets,
} from "../../src/game/rules";

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
    expect(scoreTargets(0, 3, 1, [TARGETS.life]).lives).toBe(4);
    expect(scoreTargets(0, MAX_LIVES, 1, [TARGETS.life]).lives).toBe(MAX_LIVES);
  });
});

describe("miss penalties", () => {
  it("introduces missed-target life loss gradually", () => {
    expect(missesRequiredForLifeLoss(5)).toBeUndefined();
    expect(missesRequiredForLifeLoss(6)).toBeUndefined();
    expect(missesRequiredForLifeLoss(7)).toBe(3);
    expect(missesRequiredForLifeLoss(9)).toBe(2);
    expect(missesRequiredForLifeLoss(10)).toBeUndefined();
    expect(missesRequiredForLifeLoss(12)).toBe(1);
  });

  it("makes every fifth level from level five a recovery round", () => {
    expect(isRecoveryRound(4)).toBe(false);
    expect(isRecoveryRound(5)).toBe(true);
    expect(isRecoveryRound(10)).toBe(true);
    expect(isRecoveryRound(11)).toBe(false);
  });
});
