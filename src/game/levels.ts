import type { LevelConfiguration, TargetType, Weighted } from "./types";

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
        ["aardvark", 50],
        ["bismarck", 25],
        ["bisvark", 7],
        ["aardmarck", 8],
        ["bonus_points", 5],
        ["life", 5],
      ),
      spawnTimesMs: weighted([300, 10], [400, 50], [800, 30], [1800, 10]),
      activeTimesMs: lateActive,
    },
  };
  if (level <= 5) return configs[Math.max(1, level)]!;

  const scale = 1 / (1 + (2 * (level - 5)) / 10);
  const scaled = (value: number): number => Math.max(16, Math.trunc(value * scale));
  return {
    targets: weighted<TargetType>(
      ["aardvark", 45],
      ["bismarck", 30],
      ["bisvark", 5],
      ["aardmarck", 10],
      ["bonus_points", 5],
      ["life", 5],
    ),
    spawnTimesMs: weighted(
      [scaled(300), 10],
      [scaled(400), 50],
      [scaled(800), 30],
      [scaled(1800), 10],
    ),
    activeTimesMs: weighted(
      [scaled(800), 10],
      [scaled(1300), 15],
      [scaled(3000), 50],
      [scaled(4000), 15],
      [scaled(6000), 10],
    ),
  };
}
