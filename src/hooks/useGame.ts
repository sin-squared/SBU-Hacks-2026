import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CLICK_REWARD, DISTRICTS, OFFLINE_CAP_SECONDS } from "@/game/data";
import { applyDistrictUnlocks, buyBusiness, buyUpgrade, earn, totalIncome } from "@/game/economy";
import { applyObjectives, initialState } from "@/game/progression";
import type { BusinessId, District, GameState } from "@/game/types";
import { clearSave, loadGame, saveGame } from "@/utils/save";

type Action =
  | { type: "tick"; seconds: number }
  | { type: "click" }
  | { type: "buyBusiness"; id: BusinessId }
  | { type: "buyUpgrade"; id: string }
  | { type: "load"; state: GameState }
  | { type: "reset" }
  | { type: "dismissVictory" };

/** Every action runs through progression checks so unlocks/objectives never get missed. */
function progress(s: GameState) {
  return applyObjectives(applyDistrictUnlocks(s));
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "tick":
      return progress(earn(state, totalIncome(state) * action.seconds));
    case "click":
      return progress(earn(state, CLICK_REWARD));
    case "buyBusiness":
      return progress(buyBusiness(state, action.id));
    case "buyUpgrade":
      return progress(buyUpgrade(state, action.id));
    case "load":
      return progress(action.state);
    case "reset":
      return initialState();
    case "dismissVictory":
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(0));
  const [loaded, setLoaded] = useState(false);
  const [offlineEarned, setOfflineEarned] = useState(0);
  const [newDistrict, setNewDistrict] = useState<District | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevUnlocked = useRef<string[] | null>(null);

  // Load once on mount (browser only), with capped offline earnings.
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      const elapsed = Math.min(Math.max(0, (Date.now() - saved.lastSaved) / 1000), OFFLINE_CAP_SECONDS);
      const gained = totalIncome(saved) * elapsed;
      const withOffline = earn(saved, gained);
      if (gained >= 1) setOfflineEarned(gained);
      dispatch({ type: "load", state: withOffline });
    } else {
      dispatch({ type: "load", state: initialState() });
    }
    setLoaded(true);
  }, []);

  // Single game loop.
  useEffect(() => {
    if (!loaded) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", seconds: (now - last) / 1000 });
      last = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [loaded]);

  // Autosave every 3s and when leaving.
  useEffect(() => {
    if (!loaded) return;
    const id = window.setInterval(() => saveGame(stateRef.current), 3000);
    const onUnload = () => saveGame(stateRef.current);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [loaded]);

  // Detect new district unlocks for the celebration overlay.
  useEffect(() => {
    if (!loaded) return;
    if (prevUnlocked.current) {
      const fresh = state.unlockedDistricts.find((d) => !prevUnlocked.current!.includes(d));
      if (fresh) setNewDistrict(DISTRICTS.find((d) => d.id === fresh) ?? null);
    }
    prevUnlocked.current = state.unlockedDistricts;
  }, [state.unlockedDistricts, loaded]);

  const act = useCallback((a: Action) => {
    dispatch(a);
    // Save right after meaningful actions.
    queueMicrotask(() => saveGame(stateRef.current));
  }, []);

  return {
    state,
    loaded,
    income: totalIncome(state),
    offlineEarned,
    dismissOffline: () => setOfflineEarned(0),
    newDistrict,
    dismissDistrict: () => setNewDistrict(null),
    click: () => dispatch({ type: "click" }),
    buyBusiness: (id: BusinessId) => act({ type: "buyBusiness", id }),
    buyUpgrade: (id: string) => act({ type: "buyUpgrade", id }),
    reset: () => {
      clearSave();
      prevUnlocked.current = null;
      dispatch({ type: "reset" });
      setTimeout(() => saveGame(stateRef.current), 0);
    },
  };
}

export type Game = ReturnType<typeof useGame>;
