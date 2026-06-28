export type Point = { x: number; y: number };

export type TargetType =
  "aardvark" | "bismarck" | "bisvark" | "aardmarck" | "life" | "bonus_points";

export type TargetClass = "points" | "bad" | "powerup";
export type TargetState = "spawn" | "active" | "circled" | "timedout";

export type TargetDefinition = {
  type: TargetType;
  targetClass: TargetClass;
  points: number;
  multiplier: number;
};

export type Weighted<T> = { value: T; weight: number };

export type LevelConfiguration = {
  targets: Array<Weighted<TargetType>>;
  spawnTimesMs: Array<Weighted<number>>;
  activeTimesMs: Array<Weighted<number>>;
};

export type Slot = {
  id: number;
  x: number;
  y: number;
  target?: TargetDefinition;
  state?: TargetState;
  remainingMs: number;
};

export type LeaderboardEntry = {
  name: string;
  level: number;
  score: number;
  timestamp: number;
};
