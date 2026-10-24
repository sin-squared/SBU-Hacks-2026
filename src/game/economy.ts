import { BUSINESSES, COST_GROWTH, DISTRICTS, UPGRADES } from "./data";
import type { Business, BusinessId, GameState, Upgrade } from "./types";

export function businessCost(base: number, owned: number): number {
  return Math.floor(base * Math.pow(COST_GROWTH, owned));
}

export function getBusiness(id: BusinessId): Business {
  return BUSINESSES.find((b) => b.id === id)!;
}

export function businessMultiplier(state: GameState, id: BusinessId): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades.includes(u.id)) continue;
    if (u.effect.kind === "global") m *= u.effect.multiplier;
    else if (u.effect.target === id) m *= u.effect.multiplier;
  }
  return m;
}

export function businessIncome(state: GameState, id: BusinessId): number {
  return state.owned[id] * getBusiness(id).baseIncome * businessMultiplier(state, id);
}

export function totalIncome(state: GameState): number {
  return BUSINESSES.reduce((sum, b) => sum + businessIncome(state, b.id), 0);
}

export function isDistrictUnlocked(state: GameState, district: Business["district"]): boolean {
  return state.unlockedDistricts.includes(district);
}

export function canBuyBusiness(state: GameState, id: BusinessId): boolean {
  const b = getBusiness(id);
  return isDistrictUnlocked(state, b.district) && state.coins >= businessCost(b.baseCost, state.owned[id]);
}

export function buyBusiness(state: GameState, id: BusinessId): GameState {
  if (!canBuyBusiness(state, id)) return state;
  const b = getBusiness(id);
  const cost = businessCost(b.baseCost, state.owned[id]);
  return { ...state, coins: state.coins - cost, owned: { ...state.owned, [id]: state.owned[id] + 1 } };
}

export function canBuyUpgrade(state: GameState, u: Upgrade): boolean {
  return !state.upgrades.includes(u.id) && u.requires(state) && state.coins >= u.cost;
}

export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const u = UPGRADES.find((x) => x.id === upgradeId);
  if (!u || !canBuyUpgrade(state, u)) return state;
  return { ...state, coins: state.coins - u.cost, upgrades: [...state.upgrades, u.id] };
}

export function earn(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  return { ...state, coins: state.coins + amount, lifetimeCoins: state.lifetimeCoins + amount };
}

/** Unlocks are permanent: only ever adds districts. */
export function applyDistrictUnlocks(state: GameState): GameState {
  const newly = DISTRICTS.filter(
    (d) => !state.unlockedDistricts.includes(d.id) && state.lifetimeCoins >= d.unlockAt,
  );
  if (!newly.length) return state;
  return { ...state, unlockedDistricts: [...state.unlockedDistricts, ...newly.map((d) => d.id)] };
}

export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return abs < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  const units = ["K", "M", "B", "T", "Qa", "Qi"];
  let i = -1;
  let v = abs;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${n < 0 ? "-" : ""}${v.toFixed(v < 10 ? 2 : 1).replace(/\.?0+$/, "")}${units[i]}`;
}
