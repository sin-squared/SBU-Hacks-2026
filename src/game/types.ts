export type DistrictId = "foundry" | "industrial" | "aetherport";

export type BusinessId =
  | "workshop"
  | "bakery"
  | "factory"
  | "automaton"
  | "airship"
  | "engine";

export interface District {
  id: DistrictId;
  name: string;
  description: string;
  /** Lifetime coins required to unlock. */
  unlockAt: number;
}

export interface Business {
  id: BusinessId;
  name: string;
  description: string;
  baseCost: number;
  baseIncome: number;
  district: DistrictId;
}

export type UpgradeEffect =
  | { kind: "business"; target: BusinessId; multiplier: number }
  | { kind: "global"; multiplier: number };

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
  /** Human readable requirement. */
  requirementText: string;
  requires: (s: GameState) => boolean;
}

export interface Objective {
  id: string;
  title: string;
  /** Returns [current, target]. Objective completes when current >= target. */
  progress: (s: GameState) => [number, number];
}

export interface GameState {
  coins: number;
  lifetimeCoins: number;
  steamCores: number;
  owned: Record<BusinessId, number>;
  upgrades: string[];
  unlockedDistricts: DistrictId[];
  completedObjectives: string[];
  victory: boolean;
  startedAt: number;
  lastSaved: number;
}
