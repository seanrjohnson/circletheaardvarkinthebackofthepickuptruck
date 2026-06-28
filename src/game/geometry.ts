import type { Point } from "./types";

const EPSILON = 0.001;

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const r = subtract(b, a);
  const s = subtract(d, c);
  const denominator = cross(r, s);
  const cma = subtract(c, a);

  if (Math.abs(denominator) < EPSILON) return undefined;

  const t = cross(cma, s) / denominator;
  const u = cross(cma, r) / denominator;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return undefined;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

export function closeLasso(points: Point[]): Point[] | undefined {
  if (points.length < 4) return undefined;
  const previous = points.at(-2)!;
  const current = points.at(-1)!;
  let best: { point: Point; segment: number; distance: number } | undefined;

  for (let index = 0; index <= points.length - 4; index += 1) {
    const hit = segmentIntersection(previous, current, points[index]!, points[index + 1]!);
    if (!hit) continue;
    const hitDistance = distance(previous, hit);
    if (!best || hitDistance < best.distance) {
      best = { point: hit, segment: index, distance: hitDistance };
    }
  }

  if (!best) return undefined;
  return [best.point, ...points.slice(best.segment + 1, -1), best.point];
}

function pointOnSegment(point: Point, a: Point, b: Point): boolean {
  const ab = subtract(b, a);
  const ap = subtract(point, a);
  if (Math.abs(ab.x) < EPSILON && Math.abs(ab.y) < EPSILON) {
    return distance(point, a) < EPSILON;
  }
  if (Math.abs(cross(ab, ap)) > EPSILON) return false;
  const dot = ap.x * ab.x + ap.y * ab.y;
  return dot >= -EPSILON && dot <= ab.x * ab.x + ab.y * ab.y + EPSILON;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[j]!;
    const b = polygon[i]!;
    if (pointOnSegment(point, a, b)) return true;
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(polygon: Point[]): Point {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length - 1; index += 1) {
    const a = polygon[index]!;
    const b = polygon[index + 1]!;
    const factor = a.x * b.y - b.x * a.y;
    twiceArea += factor;
    x += (a.x + b.x) * factor;
    y += (a.y + b.y) * factor;
  }
  if (Math.abs(twiceArea) < EPSILON) {
    const unique = polygon.slice(0, -1);
    return {
      x: unique.reduce((sum, point) => sum + point.x, 0) / Math.max(1, unique.length),
      y: unique.reduce((sum, point) => sum + point.y, 0) / Math.max(1, unique.length),
    };
  }
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
}
