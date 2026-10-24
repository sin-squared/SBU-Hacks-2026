import type { Business, District, Objective, Upgrade } from "./types";

export const CLICK_REWARD = 2;
export const COST_GROWTH = 1.15;
export const OFFLINE_CAP_SECONDS = 2 * 60 * 60;

export const DISTRICTS: District[] = [
  {
    id: "foundry",
    name: "Foundry Row",
    description: "Soot-stained lanes of tinkers and bakers where Brasshaven's revival begins.",
    unlockAt: 0,
  },
  {
    id: "industrial",
    name: "The Industrial Quarter",
    description: "Towering smokestacks and assembly halls humming with automata.",
    unlockAt: 500,
  },
  {
    id: "aetherport",
    name: "Aetherport",
    description: "Sky docks above the clouds, home of airships and the Great Engine.",
    unlockAt: 3000,
  },
];

export const BUSINESSES: Business[] = [
  { id: "workshop", name: "Clockwork Workshop", description: "Tinkers mend pocket watches and music boxes.", baseCost: 15, baseIncome: 1, district: "foundry" },
  { id: "bakery", name: "Steam Bakery", description: "Pressure-baked loaves feed the night shift.", baseCost: 50, baseIncome: 3, district: "foundry" },
  { id: "factory", name: "Gear Factory", description: "Stamps cogs by the thousand for the whole city.", baseCost: 180, baseIncome: 9, district: "industrial" },
  { id: "automaton", name: "Automaton Assembly", description: "Brass workers built by brass workers.", baseCost: 650, baseIncome: 28, district: "industrial" },
  { id: "airship", name: "Airship Dock", description: "Freight dirigibles bring trade from distant ports.", baseCost: 2000, baseIncome: 85, district: "aetherport" },
  { id: "engine", name: "Great Engine", description: "The colossal heart of Brasshaven. Restore it to full power.", baseCost: 6000, baseIncome: 220, district: "aetherport" },
];

export const UPGRADES: Upgrade[] = [
  { id: "precision-gears", name: "Precision Gears", description: "Finely cut teeth for every workshop mechanism.", cost: 75, effect: { kind: "business", target: "workshop", multiplier: 2 }, requirementText: "Own a Clockwork Workshop", requires: (s) => s.owned.workshop > 0 },
  { id: "pressurized-ovens", name: "Pressurized Ovens", description: "Steam-sealed ovens bake twice as fast.", cost: 150, effect: { kind: "business", target: "bakery", multiplier: 2 }, requirementText: "Own a Steam Bakery", requires: (s) => s.owned.bakery > 0 },
  { id: "assembly-automation", name: "Assembly Automation", description: "Conveyor arms replace hand-fed presses.", cost: 500, effect: { kind: "business", target: "factory", multiplier: 2 }, requirementText: "Own a Gear Factory", requires: (s) => s.owned.factory > 0 },
  { id: "master-engineer", name: "Master Engineer", description: "A renowned engineer tunes every machine in the city.", cost: 1000, effect: { kind: "global", multiplier: 1.25 }, requirementText: "Unlock the Industrial Quarter", requires: (s) => s.unlockedDistricts.includes("industrial") },
  { id: "aether-drive", name: "Aether Drive", description: "Crystal-charged propellers for the dock fleet.", cost: 3000, effect: { kind: "business", target: "airship", multiplier: 2 }, requirementText: "Own an Airship Dock", requires: (s) => s.owned.airship > 0 },
];

export const OBJECTIVES: Objective[] = [
  { id: "first-workshop", title: "Purchase your first Clockwork Workshop", progress: (s) => [s.owned.workshop, 1] },
  { id: "earn-100", title: "Earn 100 lifetime coins", progress: (s) => [s.lifetimeCoins, 100] },
  { id: "unlock-industrial", title: "Unlock the Industrial Quarter", progress: (s) => [s.lifetimeCoins, 500] },
  { id: "first-factory", title: "Purchase your first Gear Factory", progress: (s) => [s.owned.factory, 1] },
  { id: "unlock-aetherport", title: "Unlock Aetherport", progress: (s) => [s.lifetimeCoins, 3000] },
  { id: "restore-engine", title: "Restore the Great Engine", progress: (s) => [s.owned.engine, 1] },
];

export const FINAL_OBJECTIVE_ID = "restore-engine";
