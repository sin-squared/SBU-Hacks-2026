import { initialState } from "@/game/progression";
import type { GameState } from "@/game/types";

const KEY = "brasshaven-save-v1";

export function saveGame(state: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, lastSaved: Date.now() }));
  } catch {
    /* storage full or disabled */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = initialState();
    return { ...base, ...parsed, owned: { ...base.owned, ...parsed.owned } };
  } catch {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
