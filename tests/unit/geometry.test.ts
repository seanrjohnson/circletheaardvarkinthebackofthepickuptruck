import { describe, expect, it } from "vitest";
import {
  closeLasso,
  pointInPolygon,
  polygonCentroid,
  segmentIntersection,
} from "../../src/game/geometry";

describe("lasso geometry", () => {
  it("finds segment intersections", () => {
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toEqual({ x: 5, y: 5 });
  });

  it("closes a lasso at its self-intersection", () => {
    const closed = closeLasso([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: -5 },
    ]);
    expect(closed?.[0]).toEqual(closed?.at(-1));
    expect(closed).toHaveLength(5);
  });

  it("includes points on the polygon boundary", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 0, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(polygonCentroid(square)).toEqual({ x: 5, y: 5 });
  });
});
