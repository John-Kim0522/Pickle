import type { Match, MatchCategory, Player, Standing, StandingsByCategory } from "./types";

export type MatchResult = {
  complete: boolean;
  setsA: number;
  setsB: number;
  pointsA: number;
  pointsB: number;
  winner: "A" | "B" | null;
};

function present(a: number | null, b: number | null) {
  return a !== null && b !== null;
}

export function summarizeMatch(match: Match): MatchResult {
  const sets = [
    [match.set1_a, match.set1_b],
    [match.set2_a, match.set2_b],
    [match.set3_a, match.set3_b],
  ] as const;

  let setsA = 0;
  let setsB = 0;
  let pointsA = 0;
  let pointsB = 0;

  for (const [a, b] of sets) {
    if (!present(a, b)) continue;
    pointsA += a as number;
    pointsB += b as number;
    if ((a as number) > (b as number)) setsA += 1;
    else if ((b as number) > (a as number)) setsB += 1;
  }

  const complete = match.status === "completed" && (setsA === 2 || setsB === 2);
  return {
    complete,
    setsA,
    setsB,
    pointsA,
    pointsB,
    winner: complete ? (setsA > setsB ? "A" : "B") : null,
  };
}

function teamName(teamId: number, players: Player[]) {
  const members = players
    .filter((p) => p.team_id === teamId)
    .sort((a, b) => a.display_order - b.display_order);
  return members.map((p) => p.name).join(" · ");
}

function competitorId(match: Match, side: "A" | "B", category: MatchCategory, players: Player[]) {
  const ids = side === "A" ? match.side_a : match.side_b;
  if (category === "doubles") {
    return players.find((p) => p.id === ids[0])?.team_id ?? -1;
  }
  return ids[0] ?? -1;
}

function makeRows(category: MatchCategory, players: Player[]): Standing[] {
  if (category === "doubles") {
    return [1, 2, 3, 4].map((teamId) => ({
      entityId: teamId,
      name: teamName(teamId, players),
      games: 0,
      wins: 0,
      losses: 0,
      setsFor: 0,
      setsAgainst: 0,
      setDiff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    }));
  }

  const gender = category === "mens" ? "M" : "F";
  return players
    .filter((p) => p.gender === gender)
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => ({
      entityId: p.id,
      name: p.name,
      games: 0,
      wins: 0,
      losses: 0,
      setsFor: 0,
      setsAgainst: 0,
      setDiff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    }));
}

function sortStandings(rows: Standing[], category: MatchCategory, matches: Match[], players: Player[]) {
  const byWins = new Map<number, Standing[]>();
  for (const row of rows) byWins.set(row.wins, [...(byWins.get(row.wins) ?? []), row]);

  const winGroups = [...byWins.entries()].sort((a, b) => b[0] - a[0]);
  const sorted: Standing[] = [];

  for (const [, group] of winGroups) {
    if (group.length === 2) {
      const [x, y] = group;
      const headToHead = matches.find((m) => {
        if (m.category !== category || m.status !== "completed") return false;
        const a = competitorId(m, "A", category, players);
        const b = competitorId(m, "B", category, players);
        return (a === x.entityId && b === y.entityId) || (a === y.entityId && b === x.entityId);
      });

      if (headToHead) {
        const result = summarizeMatch(headToHead);
        if (result.complete && result.winner) {
          const winnerId = competitorId(headToHead, result.winner, category, players);
          sorted.push(winnerId === x.entityId ? x : y, winnerId === x.entityId ? y : x);
          continue;
        }
      }
    }

    group.sort((a, b) =>
      b.setDiff - a.setDiff ||
      b.pointDiff - a.pointDiff ||
      b.pointsFor - a.pointsFor ||
      a.name.localeCompare(b.name, "ko")
    );
    sorted.push(...group);
  }

  return sorted;
}

function calculateCategory(category: MatchCategory, players: Player[], matches: Match[]) {
  const rows = makeRows(category, players);
  const map = new Map(rows.map((r) => [r.entityId, r]));

  for (const match of matches) {
    if (match.category !== category || match.status !== "completed") continue;
    const result = summarizeMatch(match);
    if (!result.complete || !result.winner) continue;

    const aId = competitorId(match, "A", category, players);
    const bId = competitorId(match, "B", category, players);
    const a = map.get(aId);
    const b = map.get(bId);
    if (!a || !b) continue;

    a.games += 1;
    b.games += 1;
    if (result.winner === "A") {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }

    a.setsFor += result.setsA;
    a.setsAgainst += result.setsB;
    b.setsFor += result.setsB;
    b.setsAgainst += result.setsA;

    a.pointsFor += result.pointsA;
    a.pointsAgainst += result.pointsB;
    b.pointsFor += result.pointsB;
    b.pointsAgainst += result.pointsA;
  }

  for (const row of rows) {
    row.setDiff = row.setsFor - row.setsAgainst;
    row.pointDiff = row.pointsFor - row.pointsAgainst;
  }

  return sortStandings(rows, category, matches, players);
}

export function calculateStandings(players: Player[], matches: Match[]): StandingsByCategory {
  return {
    doubles: calculateCategory("doubles", players, matches),
    mens: calculateCategory("mens", players, matches),
    womens: calculateCategory("womens", players, matches),
  };
}
