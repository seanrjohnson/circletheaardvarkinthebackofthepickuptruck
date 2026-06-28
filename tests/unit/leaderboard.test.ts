import { describe, expect, it } from "vitest";
import { LEADERBOARD_KEY, normalizeName, saveScore } from "../../src/game/leaderboard";

describe("local leaderboard", () => {
  it("sanitizes names and provides an anonymous default", () => {
    expect(normalizeName("Otto! von Bismarck")).toBe("OttovonBisma");
    expect(normalizeName("!")).toBe("ANON");
  });

  it("stores scores in descending order", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    saveScore({ name: "A", level: 1, score: 10, timestamp: 1 }, storage);
    const scores = saveScore({ name: "B", level: 2, score: 20, timestamp: 2 }, storage);
    expect(scores.map((entry) => entry.name)).toEqual(["B", "A"]);
    expect(values.has(LEADERBOARD_KEY)).toBe(true);
  });
});
