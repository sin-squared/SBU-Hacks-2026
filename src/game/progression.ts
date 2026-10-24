import { FINAL_OBJECTIVE_ID, OBJECTIVES } from "./data";
import type { GameState, Objective } from "./types";

export function initialState(now = Date.now()): GameState {
  return {
    coins: 25,
    lifetimeCoins: 0,
    steamCores: 0,
    owned: { workshop: 0, bakery: 0, factory: 0, automaton: 0, airship: 0, engine: 0 },
    upgrades: [],
    unlockedDistricts: ["foundry"],
    completedObjectives: [],
    victory: false,
    startedAt: now,
    lastSaved: now,
  };
}

/** The first objective not yet completed (objectives are sequential). */
export function currentObjective(state: GameState): Objective | null {
  return OBJECTIVES.find((o) => !state.completedObjectives.includes(o.id)) ?? null;
}

/** Completes the current objective(s) in order; each grants 1 Steam Core. */
export function applyObjectives(state: GameState): GameState {
  let s = state;
  let obj = currentObjective(s);
  while (obj) {
    const [cur, target] = obj.progress(s);
    if (cur < target) break;
    s = {
      ...s,
      completedObjectives: [...s.completedObjectives, obj.id],
      steamCores: s.steamCores + 1,
      victory: s.victory || obj.id === FINAL_OBJECTIVE_ID,
    };
    obj = currentObjective(s);
  }
  return s;
}
