import { BALANCE, BUILDINGS, type Resource } from './city-config';
import { freshCity, steamCapacity, type CityState, type Plot } from './city';
export const CITY_SAVE_KEY = 'brasshaven-save-v2';
export function decodeCity(raw: string, now = Date.now()): CityState | null {
 try { const p = JSON.parse(raw); if (p.version !== 2 || !p.state || typeof p.state !== 'object') return null; const v = p.state; const base = freshCity(now); const finite = (n: unknown, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : fallback;
 const strings = (a: unknown) => Array.isArray(a) ? [...new Set(a.filter((x): x is string => typeof x === 'string'))] : [];
 const plots: (Plot | null)[] = base.plots.map((_, i) => { const b = v.plots?.[i]; return b && Object.hasOwn(BUILDINGS, b.kind) ? { kind: b.kind, level: Math.min(BALANCE.maxLevel, Math.max(1, Math.floor(finite(b.level, 1)))) } : null; });
 const expedition = v.expedition && Number.isInteger(v.expedition.destination) && v.expedition.destination >= 0 && v.expedition.destination < 3 && Number.isFinite(v.expedition.endsAt) ? { destination: v.expedition.destination, endsAt: v.expedition.endsAt, choice: [0, 1].includes(v.expedition.choice) ? v.expedition.choice : null } : null;
 const engineStep = Math.min(3, Math.floor(finite(v.engineStep)));
 const s: CityState = { ...base, resources: { ...base.resources }, earned: finite(v.earned), plots, contracts: strings(v.contracts), permits: strings(v.permits), technologies: strings(v.technologies), blueprints: strings(v.blueprints), artifact: v.artifact === true, expedition, expeditionCount: Math.floor(finite(v.expeditionCount)), engineStep, victory: engineStep === 3, eventIndex: Math.floor(finite(v.eventIndex)), eventDue: finite(v.eventDue, BALANCE.eventInterval), eventActive: v.eventActive === true, elapsed: finite(v.elapsed), lastSaved: finite(v.lastSaved, now), demo: v.demo === true };
 for (const k of Object.keys(s.resources) as Resource[]) s.resources[k] = finite(v.resources?.[k], base.resources[k]); s.resources.steam = Math.min(s.resources.steam, steamCapacity(s)); return s;
 } catch { return null; }
}
export function readCity(): CityState { const now = Date.now(); try { const raw = localStorage.getItem(CITY_SAVE_KEY); if (raw) { const decoded = decodeCity(raw, now); if (decoded) return decoded; }
 const legacy = localStorage.getItem('brasshaven-save-v1'); if (legacy) { const p = JSON.parse(legacy); const base = freshCity(now); const coins = typeof p.coins === 'number' && Number.isFinite(p.coins) ? Math.max(25, p.coins) : 25; const owned = p.owned ?? {}; const kinds = ['workshop', 'bakery', 'factory', 'dock'] as const; let i = 0; for (const kind of kinds) if ((owned[kind === 'dock' ? 'airship' : kind] ?? 0) > 0) base.plots[i++] = { kind, level: 1 }; base.resources.coins = coins; base.earned = Math.max(0, Number(p.lifetimeCoins) || 0); base.notice = 'Your old coin balance and businesses were carried into the new city. Districts now require permits.'; return base; }
 } catch { /* Invalid saves start safely. */ } return freshCity(now); }
export function writeCity(s: CityState) { try { localStorage.setItem(CITY_SAVE_KEY, JSON.stringify({ version: 2, state: { ...s, lastSaved: Date.now() } })); return true; } catch { return false; } }
