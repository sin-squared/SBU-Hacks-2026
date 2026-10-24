import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { advanceCity, cityAction, freshCity, type CityAction, type CityState } from '@/game/city';
import { readCity, writeCity } from '@/game/city-save';
type Action = { type: 'load' | 'reset'; state: CityState } | { type: 'tick'; seconds: number } | { type: 'act'; action: CityAction; now: number };
function reducer(s: CityState, a: Action) { if (a.type === 'act') return cityAction(s, a.action, a.now); if (a.type === 'tick') return advanceCity(s, a.seconds); return a.state; }
export function useCity() {
 const [state, dispatch] = useReducer(reducer, undefined, () => freshCity(0)); const [loaded, setLoaded] = useState(false); const [saveError, setSaveError] = useState(false); const [now, setNow] = useState(0); const ref = useRef(state); ref.current = state;
 useEffect(() => { const saved = readCity(); const current = Date.now(); const seconds = Math.max(0, (current - saved.lastSaved) / 1000); const next = advanceCity(saved, seconds); dispatch({ type: 'load', state: { ...next, lastSaved: current, notice: seconds > 10 ? 'Welcome back. Your city worked while you were away (up to 2 hours). Expedition cargo awaits collection.' : saved.notice } }); setNow(current); setLoaded(true); }, []);
 useEffect(() => { if (!loaded) return; let last = Date.now(); const timer = window.setInterval(() => { const current = Date.now(); dispatch({ type: 'tick', seconds: (current - last) / 1000 }); setNow(current); last = current; }, 1000); const save = () => setSaveError(!writeCity(ref.current)); const saveTimer = window.setInterval(save, 3000); const hidden = () => { if (document.visibilityState === 'hidden') save(); }; window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', hidden); return () => { window.clearInterval(timer); window.clearInterval(saveTimer); window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); }; }, [loaded]);
 // Persist the committed reducer result, not a potentially stale pre-dispatch reference.
 useEffect(() => { if (loaded) setSaveError(!writeCity(state)); }, [state, loaded]);
 const act = useCallback((action: CityAction) => dispatch({ type: 'act', action, now: Date.now() }), []);
 const reset = useCallback(() => dispatch({ type: 'reset', state: freshCity() }), []);
 return { state, loaded, now, saveError, act, reset };
}
export type CityGame = ReturnType<typeof useCity>;
