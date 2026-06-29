import type { TargetDefinition, TargetType } from "./types";

export const STARTING_LIVES = 3;
export const MAX_LIVES = 8;
export const ROUND_TIME_MS = 40_000;

export function missesRequiredForLifeLoss(level: number): number | undefined {
  if (level < 7) return undefined;
  if (level < 9) return 3;
  if (level < 12) return 2;
  return 1;
}

export const TARGETS: Record<TargetType, TargetDefinition> = {
  aardvark: { type: "aardvark", targetClass: "points", points: 50, multiplier: 1 },
  bismarck: { type: "bismarck", targetClass: "bad", points: 0, multiplier: 0.75 },
  bisvark: { type: "bisvark", targetClass: "points", points: 75, multiplier: 1 },
  aardmarck: { type: "aardmarck", targetClass: "bad", points: 0, multiplier: 0.75 },
  life: { type: "life", targetClass: "powerup", points: 0, multiplier: 1 },
  bonus_points: {
    type: "bonus_points",
    targetClass: "powerup",
    points: 0,
    multiplier: 2,
  },
};

export type ScoreResult = { score: number; lives: number; deltaScore: number };

export function scoreTargets(
  currentScore: number,
  currentLives: number,
  level: number,
  targets: TargetDefinition[],
): ScoreResult {
  let pointTotal = 0;
  let positiveCount = 0;
  let positiveMultiplier = 1;
  let negativeMultiplier = 1;
  let lifeDelta = 0;

  for (const target of targets) {
    pointTotal += target.points;
    if (target.points > 0) positiveCount += 1;
    if (target.type === "life") lifeDelta += 1;
    if (target.multiplier < 1) {
      lifeDelta -= 1;
      negativeMultiplier *= target.multiplier;
    } else if (target.multiplier > 1) {
      positiveMultiplier *= target.multiplier;
    }
  }

  const deltaScore =
    negativeMultiplier < 0.999
      ? -Math.trunc(currentScore * (1 - negativeMultiplier))
      : pointTotal > 0
        ? Math.trunc(pointTotal * positiveMultiplier * level * positiveCount)
        : 0;
  return {
    score: Math.max(0, currentScore + deltaScore),
    lives: Math.max(0, Math.min(MAX_LIVES, currentLives + lifeDelta)),
    deltaScore,
  };
}
