import type { LevelConfiguration, TargetType, Weighted } from "./types";
import { isRecoveryRound } from "./rules";

export function weightedPick<T>(values: Array<Weighted<T>>, random = Math.random): T {
  const total = values.reduce((sum, item) => sum + Math.abs(item.weight), 0);
  if (total <= 0) throw new Error("A weighted distribution must have a positive total");
  let selected = random() * total;
  for (const item of values) {
    selected -= Math.abs(item.weight);
    if (selected < 0) return item.value;
  }
  return values.at(-1)!.value;
}

const weighted = <T>(...pairs: Array<[T, number]>): Array<Weighted<T>> =>
  pairs.map(([value, weight]) => ({ value, weight }));

export function getLevelConfiguration(level: number): LevelConfiguration {
  const commonActive = weighted([1000, 10], [1500, 15], [4000, 50], [5000, 15], [7000, 10]);
  const quickerActive = weighted([1000, 10], [1500, 15], [3500, 50], [4000, 15], [6000, 10]);
  const lateActive = weighted([800, 10], [1300, 15], [3000, 50], [4000, 15], [6000, 10]);
  const configs: Record<number, LevelConfiguration> = {
    1: {
      targets: weighted<TargetType>(["aardvark", 70], ["bismarck", 30]),
      spawnTimesMs: weighted([500, 10], [750, 50], [1500, 30], [2000, 10]),
      activeTimesMs: commonActive,
    },
    2: {
      targets: weighted<TargetType>(["aardvark", 70], ["bismarck", 20], ["bisvark", 10]),
      spawnTimesMs: weighted([400, 10], [500, 50], [1200, 30], [2000, 10]),
      activeTimesMs: commonActive,
    },
    3: {
      targets: weighted<TargetType>(
        ["aardvark", 60],
        ["bismarck", 25],
        ["bisvark", 10],
        ["aardmarck", 5],
      ),
      spawnTimesMs: weighted([400, 10], [500, 50], [1200, 30], [2000, 10]),
      activeTimesMs: quickerActive,
    },
    4: {
      targets: weighted<TargetType>(
        ["aardvark", 55],
        ["bismarck", 25],
        ["bisvark", 10],
        ["aardmarck", 5],
        ["bonus_points", 5],
      ),
      spawnTimesMs: weighted([300, 10], [400, 50], [800, 30], [1800, 10]),
      activeTimesMs: lateActive,
    },
    5: {
      targets: weighted<TargetType>(
        ["aardvark", 45],
        ["bismarck", 25],
        ["bisvark", 7],
        ["aardmarck", 8],
        ["bonus_points", 5],
        ["life", 10],
      ),
      spawnTimesMs: weighted([400, 10], [550, 50], [1000, 30], [2100, 10]),
      activeTimesMs: weighted([1000, 10], [1600, 15], [3800, 50], [4800, 15], [6800, 10]),
    },
  };
  if (level <= 5) return configs[Math.max(1, level)]!;

  // Difficulty increases forever but approaches a playable timing floor instead of zero.
  const scale = 0.55 + 0.45 * Math.exp(-0.08 * (level - 6));
  const bismarckBoost = Math.min(7, Math.floor((level - 6) / 3));
  const disguiseBoost = Math.min(4, Math.floor((level - 6) / 5));
  const recoveryRound = isRecoveryRound(level);
  const timingScale = recoveryRound ? scale * 1.15 : scale;
  const recoveryBismarckBoost = Math.floor(bismarckBoost / 2);
  const recoveryDisguiseBoost = Math.floor(disguiseBoost / 2);
  const targets = recoveryRound
    ? weighted<TargetType>(
        ["aardvark", 45 - recoveryBismarckBoost - recoveryDisguiseBoost],
        ["bismarck", 24 + recoveryBismarckBoost],
        ["bisvark", 5],
        ["aardmarck", 6 + recoveryDisguiseBoost],
        ["bonus_points", 10],
        ["life", 10],
      )
    : weighted<TargetType>(
        ["aardvark", 49 - bismarckBoost - disguiseBoost],
        ["bismarck", 28 + bismarckBoost],
        ["bisvark", 5],
        ["aardmarck", 8 + disguiseBoost],
        ["bonus_points", 5],
        ["life", 5],
      );
  const scaledForRound = (value: number): number => Math.trunc(value * timingScale);
  return {
    targets,
    spawnTimesMs: weighted(
      [scaledForRound(350), 10],
      [scaledForRound(500), 50],
      [scaledForRound(900), 30],
      [scaledForRound(1900), 10],
    ),
    activeTimesMs: weighted(
      [scaledForRound(900), 10],
      [scaledForRound(1450), 15],
      [scaledForRound(3400), 50],
      [scaledForRound(4400), 15],
      [scaledForRound(6400), 10],
    ),
  };
}
