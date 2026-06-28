import type { LeaderboardEntry } from "./types";

export const LEADERBOARD_KEY = "circle-aardvark.highScores.v1";

export function normalizeName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "ANON";
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || b.level - a.level || a.timestamp - b.timestamp)
    .slice(0, 10);
}

export function loadLeaderboard(
  storage: Pick<Storage, "getItem"> = localStorage,
): LeaderboardEntry[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(LEADERBOARD_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return sortLeaderboard(
      value.filter(
        (entry): entry is LeaderboardEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.name === "string" &&
          Number.isFinite(entry.level) &&
          Number.isFinite(entry.score) &&
          Number.isFinite(entry.timestamp),
      ),
    );
  } catch {
    return [];
  }
}

export function saveScore(
  entry: LeaderboardEntry,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): LeaderboardEntry[] {
  const scores = sortLeaderboard([
    ...loadLeaderboard(storage),
    { ...entry, name: normalizeName(entry.name) },
  ]);
  storage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  return scores;
}
