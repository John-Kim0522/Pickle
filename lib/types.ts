export type Gender = "M" | "F";
export type MatchCategory = "doubles" | "mens" | "womens";

export type Player = {
  id: number;
  name: string;
  gender: Gender;
  team_id: number;
  display_order: number;
};

export type Match = {
  id: number;
  category: MatchCategory;
  round: number;
  match_no: number;
  side_a: number[];
  side_b: number[];
  set1_a: number | null;
  set1_b: number | null;
  set2_a: number | null;
  set2_b: number | null;
  set3_a: number | null;
  set3_b: number | null;
  status: "scheduled" | "completed";
  updated_at: string;
};

export type Standing = {
  entityId: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  setDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export type StandingsByCategory = {
  doubles: Standing[];
  mens: Standing[];
  womens: Standing[];
};

export type AppState = {
  players: Player[];
  matches: Match[];
  standings: StandingsByCategory;
};
