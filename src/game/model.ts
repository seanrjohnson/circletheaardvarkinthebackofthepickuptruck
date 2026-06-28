import { pointInPolygon } from "./geometry";
import { getLevelConfiguration, weightedPick } from "./levels";
import { TARGETS } from "./rules";
import type { Point, Slot, TargetDefinition, TargetState } from "./types";

const SLOT_POSITIONS: Point[] = [
  { x: 99, y: 89 },
  { x: 332, y: 87 },
  { x: 546, y: 87 },
  { x: 99, y: 239 },
  { x: 332, y: 237 },
  { x: 546, y: 237 },
  { x: 99, y: 385 },
  { x: 332, y: 383 },
  { x: 546, y: 383 },
];

const END_DURATIONS: Record<Exclude<TargetState, "spawn" | "active">, number> = {
  circled: 950,
  timedout: 350,
};

export type ModelEvent =
  | { type: "spawned" | "activated" | "removed"; slot: Slot }
  | { type: "timedout"; slot: Slot; target: TargetDefinition };

export class RoundModel {
  readonly slots: Slot[] = SLOT_POSITIONS.map((position, id) => ({
    id,
    ...position,
    remainingMs: 0,
  }));

  private readonly config;
  private spawnRemainingMs: number;

  constructor(
    readonly level: number,
    private readonly random: () => number = Math.random,
  ) {
    this.config = getLevelConfiguration(level);
    this.spawnRemainingMs = weightedPick(this.config.spawnTimesMs, random);
  }

  update(deltaMs: number): ModelEvent[] {
    const events: ModelEvent[] = [];
    let spawnedSlotId: number | undefined;
    this.spawnRemainingMs -= deltaMs;
    if (this.spawnRemainingMs <= 0) {
      const empty = this.slots.filter((slot) => !slot.target);
      if (empty.length > 0) {
        const slot = empty[Math.min(empty.length - 1, Math.floor(this.random() * empty.length))]!;
        slot.target = TARGETS[weightedPick(this.config.targets, this.random)];
        slot.state = "spawn";
        slot.remainingMs = 500;
        spawnedSlotId = slot.id;
        events.push({ type: "spawned", slot });
      }
      this.spawnRemainingMs = weightedPick(this.config.spawnTimesMs, this.random);
    }

    for (const slot of this.slots) {
      if (slot.id === spawnedSlotId) continue;
      if (!slot.target || !slot.state) continue;
      slot.remainingMs -= deltaMs;
      if (slot.remainingMs > 0) continue;
      if (slot.state === "spawn") {
        slot.state = "active";
        slot.remainingMs = weightedPick(this.config.activeTimesMs, this.random);
        events.push({ type: "activated", slot });
      } else if (slot.state === "active") {
        const target = slot.target;
        slot.state = "timedout";
        slot.remainingMs = END_DURATIONS.timedout;
        events.push({ type: "timedout", slot, target });
      } else {
        events.push({ type: "removed", slot: { ...slot } });
        slot.target = undefined;
        slot.state = undefined;
        slot.remainingMs = 0;
      }
    }
    return events;
  }

  circle(polygon: Point[]): TargetDefinition[] {
    const circled: TargetDefinition[] = [];
    for (const slot of this.slots) {
      if (slot.state !== "active" || !slot.target) continue;
      const yOffset =
        slot.target.type === "aardmarck"
          ? -11
          : ["life", "bonus_points"].includes(slot.target.type)
            ? -5
            : 0;
      if (!pointInPolygon({ x: slot.x, y: slot.y + yOffset }, polygon)) continue;
      circled.push(slot.target);
      slot.state = "circled";
      slot.remainingMs =
        slot.target.type === "life"
          ? 180
          : slot.target.type === "bonus_points"
            ? 350
            : END_DURATIONS.circled;
    }
    return circled;
  }
}
