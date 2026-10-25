import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { advanceCity, cityAction, freshCity, type CityAction, type CityState } from '@/game/city';
import { readCity, writeCity } from '@/game/city-save';
type Action = { type: 'load'; state: CityState } | { type: 'tick'; seconds: number; randomRoll: number; now: number } | { type: 'act'; action: CityAction; now: number };
function reducer(s: CityState, a: Action) { if (a.type === 'act') return { ...cityAction(s, a.action, a.now), lastSaved: a.now }; if (a.type === 'tick') return { ...advanceCity(s, a.seconds, a.randomRoll, a.now), lastSaved: a.now }; return a.state; }
export function useCity() {
 const [state, dispatch] = useReducer(reducer, undefined, () => freshCity(0)); const [loaded, setLoaded] = useState(false); const [saveError, setSaveError] = useState(false); const [now, setNow] = useState(0); const ref = useRef(state); ref.current = state; const clock = useRef<number | null>(null);
 const tick = useCallback((current: number) => {
  if (clock.current === null) return;
  const seconds = Math.max(0, (current - clock.current) / 1000);
  clock.current = current;
  if (seconds > 0) dispatch({ type: 'tick', seconds, randomRoll: Math.random(), now: current });
  setNow(current);
 }, []);
 useEffect(() => { const saved = readCity(); const current = Date.now(); const seconds = Math.max(0, (current - saved.lastSaved) / 1000); const next = advanceCity(saved, seconds, Math.random(), current); dispatch({ type: 'load', state: { ...next, lastSaved: current, notice: next.eventActive || next.actionFeedback ? next.notice : seconds > 10 ? 'Welcome back. Your city worked while you were away (up to 2 hours). Expedition cargo awaits collection.' : next.notice } }); clock.current = current; setNow(current); setLoaded(true); }, []);
 const walkoutDue = state.pendingWalkout?.dueAt;
 useEffect(() => {
  if (!loaded) return;
  // The production clock wakes at a walkout boundary as well as its normal one-second cadence.
  const deadline = walkoutDue === undefined ? Infinity : (clock.current ?? Date.now()) + (walkoutDue - ref.current.elapsed) * 1000;
  let timer: number;
  const schedule = () => { const current = Date.now(); timer = window.setTimeout(() => { tick(Date.now()); schedule(); }, Math.max(0, Math.min(1000, deadline > current ? deadline - current : 1000))); };
  schedule();
  return () => window.clearTimeout(timer);
 }, [loaded, walkoutDue, tick]);
 useEffect(() => { if (!loaded) return; const save = () => setSaveError(!writeCity(ref.current, ref.current.lastSaved)); const saveTimer = window.setInterval(save, 3000); const hidden = () => { if (document.visibilityState === 'hidden') save(); }; window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', hidden); return () => { window.clearInterval(saveTimer); window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); }; }, [loaded]);
 // Persist the committed reducer result, not a potentially stale pre-dispatch reference.
 useEffect(() => { if (loaded) setSaveError(!writeCity(state, state.lastSaved)); }, [state, loaded]);
 const act = useCallback((action: CityAction) => { const current = Date.now(); tick(current); dispatch({ type: 'act', action: action.type === 'event' ? { ...action, randomRoll: Math.random() } : action, now: current }); }, [tick]);
 const reset = useCallback(() => act({ type: 'reset' }), [act]);
 return { state, loaded, now, saveError, act, reset };
}
export type CityGame = ReturnType<typeof useCity>;
