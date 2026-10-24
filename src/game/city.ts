import { BALANCE, BUILDINGS, CITY_EVENTS, CONTRACTS, DESTINATIONS, ENGINE_STEPS, TECHNOLOGIES, RESOURCE_NAMES, type BuildingKind, type Cost, type Resource, type Stock } from './city-config';
export interface Plot { kind: BuildingKind; level: number }
export interface Expedition { destination: number; endsAt: number; choice: number | null }
export interface CityState { resources: Stock; earned: number; plots: (Plot | null)[]; contracts: string[]; permits: string[]; technologies: string[]; blueprints: string[]; artifact: boolean; expedition: Expedition | null; expeditionCount: number; engineStep: number; eventIndex: number; eventDue: number; eventActive: boolean; elapsed: number; lastSaved: number; demo: boolean; victory: boolean; notice: string }
export function freshCity(now = Date.now()): CityState { return { resources: { coins: 25, gears: BALANCE.startingGears, steam: BALANCE.startingSteam, crystals: 0, research: 0 }, earned: 0, plots: Array.from({ length: 12 }, () => null), contracts: [], permits: [], technologies: [], blueprints: [], artifact: false, expedition: null, expeditionCount: 0, engineStep: 0, eventIndex: 0, eventDue: BALANCE.eventInterval, eventActive: false, elapsed: 0, lastSaved: now, demo: false, victory: false, notice: 'Foundry Row is ready for its first workshop.' }; }
export function stage(s: CityState) { return s.permits.includes('aetherport') ? 2 : s.permits.includes('industrial') ? 1 : 0; }
export function plotLimit(s: CityState) { return [4, 8, 12][stage(s)] ?? 4; }
export function steamCapacity(s: CityState) { return BALANCE.baseSteamCapacity + s.plots.reduce((n, p) => n + (p?.kind === 'boiler' ? BALANCE.boilerCapacity * p.level : 0), 0); }
export function shortage(s: CityState, cost: Cost) { return Object.entries(cost).filter(([k, n]) => s.resources[k as Resource] + 1e-8 < n).map(([k, n]) => `${Math.ceil(n - s.resources[k as Resource])} ${RESOURCE_NAMES[k as Resource]}`).join(', '); }
export function costText(cost: Cost) { return Object.entries(cost).map(([k, n]) => `${n} ${RESOURCE_NAMES[k as Resource]}`).join(' · '); }
function pay(s: CityState, cost: Cost): CityState { const resources = { ...s.resources }; for (const [k, n] of Object.entries(cost)) resources[k as Resource] = Math.max(0, resources[k as Resource] - n); return { ...s, resources }; }
function grant(s: CityState, reward: Cost): CityState { const resources = { ...s.resources }; for (const [k, n] of Object.entries(reward)) resources[k as Resource] += n; resources.steam = Math.min(resources.steam, steamCapacity(s)); return { ...s, resources, earned: s.earned + (reward.coins ?? 0) }; }
export function upgradeCost(p: Plot): Cost { return Object.fromEntries(Object.entries(BUILDINGS[p.kind].cost).map(([k, n]) => [k, Math.ceil(n * (p.level + 1))])); }
export function production(s: CityState) {
 const output: Stock = { coins: 0, gears: 0, steam: 0, crystals: 0, research: 0 }; const input = { ...output }; const shortages: string[] = [];
 s.plots.forEach((p, index) => { if (!p) return; const b = BUILDINGS[p.kind]; const row = Math.floor(index / 4); const adjacent = s.plots.some((q, j) => q?.kind === 'boiler' && Math.floor(j / 4) === row && Math.abs(j - index) === 1); const synergy = adjacent && ['factory', 'bakery'].includes(p.kind) ? 1.25 : 1;
 for (const [k, n] of Object.entries(b.input)) input[k as Resource] += n * p.level;
 for (const [k, n] of Object.entries(b.output)) { let multiplier = synergy; if (p.kind === 'boiler' && s.technologies.includes('boilers')) multiplier *= 1.5; if (k === 'gears' && s.technologies.includes('automation')) multiplier *= 1.5; output[k as Resource] += n * p.level * multiplier; }
 });
 if (input.steam > output.steam) shortages.push('Steam demand exceeds production'); if (input.gears > output.gears) shortages.push('Gear demand exceeds production'); return { output, input, shortages };
}
export function advanceCity(state: CityState, seconds: number): CityState {
 let s = { ...state, resources: { ...state.resources } }; let remaining = Math.max(0, Math.min(seconds, BALANCE.offlineCap));
 // One-second steps keep online/offline consumption identical and prevent borrowing future supplies.
 while (remaining > .00001) { const dt = Math.min(1, remaining); remaining -= dt;
 const run = (p: Plot, index: number) => { const b = BUILDINGS[p.kind]; const consumption = Object.fromEntries(Object.entries(b.input).map(([k, n]) => [k, n * p.level * dt])); if (shortage(s, consumption)) return;
 s = pay(s, consumption); const adjacent = s.plots.some((q, j) => q?.kind === 'boiler' && Math.floor(j / 4) === Math.floor(index / 4) && Math.abs(j - index) === 1); const reward: Cost = {}; for (const [k, n] of Object.entries(b.output)) { let m = adjacent && ['factory', 'bakery'].includes(p.kind) ? 1.25 : 1; if (p.kind === 'boiler' && s.technologies.includes('boilers')) m *= 1.5; if (k === 'gears' && s.technologies.includes('automation')) m *= 1.5; reward[k as Resource] = n * p.level * dt * m; } s = grant(s, reward); };
 const ordered = s.plots.map((p, i) => ({ p, i })).sort((a, b) => Number(Boolean(Object.keys(BUILDINGS[a.p?.kind ?? 'workshop'].input).length)) - Number(Boolean(Object.keys(BUILDINGS[b.p?.kind ?? 'workshop'].input).length)));
 ordered.forEach(({ p, i }) => { if (p) run(p, i); });
 }
 s.elapsed += Math.max(0, Math.min(seconds, BALANCE.offlineCap)); if (s.elapsed >= s.eventDue) s.eventActive = true; return s;
}
export type CityAction = { type: 'construct'; plot: number; kind: BuildingKind } | { type: 'upgrade' | 'demolish'; plot: number } | { type: 'contract' | 'technology'; id: string } | { type: 'launch' | 'expeditionChoice' | 'event'; index: number } | { type: 'collect' | 'engine' | 'click' | 'demo' };
export function actionReason(s: CityState, a: CityAction, now = Date.now()): string {
 let cost: Cost = {};
 switch (a.type) {
 case 'construct': if (!Number.isInteger(a.plot) || a.plot < 0 || a.plot >= plotLimit(s) || s.plots[a.plot]) return 'Select an empty unlocked plot'; if (BUILDINGS[a.kind].stage > stage(s)) return 'District permit required'; cost = BUILDINGS[a.kind].cost; break;
 case 'upgrade': { const p = s.plots[a.plot]; if (!p) return 'Select a building'; if (p.level >= BALANCE.maxLevel) return 'Maximum level reached'; cost = upgradeCost(p); break; }
 case 'demolish': if (!s.plots[a.plot]) return 'Select a building'; break;
 case 'contract': { const c = CONTRACTS.find(c => c.id === a.id); if (!c || c.stage > stage(s) || s.contracts.includes(a.id)) return 'Contract unavailable'; if (c.id !== 'gears' && !s.contracts.includes('gears')) return 'Complete The Tinkers’ Guild first'; if (s.earned < c.earned) return `Earn ${Math.ceil(c.earned - s.earned)} more lifetime coins`; if (c.id === 'sky' && (!s.technologies.includes('airships') || !s.blueprints.includes('hull'))) return 'Requires Improved Airships and a hull blueprint'; cost = c.cost; break; }
 case 'technology': { const t = TECHNOLOGIES.find(t => t.id === a.id); if (!t || s.technologies.includes(a.id)) return 'Technology unavailable'; if (stage(s) < t.stage || (t.requires && !s.technologies.includes(t.requires))) return 'Previous technology and district required'; cost = t.cost; break; }
 case 'launch': { const d = DESTINATIONS[a.index]; if (!d) return 'Unknown destination'; if (s.expedition) return 'Airship already on expedition'; if (!s.plots.some(p => p?.kind === 'dock')) return 'Construct an Airship Dock first'; cost = d.cost; break; }
 case 'expeditionChoice': { const e = s.expedition; if (!e || e.choice !== null || ![0, 1].includes(a.index)) return 'No pending expedition choice'; const d = DESTINATIONS[e.destination]; if (!d) return 'Unknown expedition'; if (now < e.endsAt - d.duration * 1000 / 2) return 'Event encountered halfway through the voyage'; cost = a.index === 0 ? e.destination === 1 ? { steam: 10 } : { gears: e.destination === 2 ? 15 : 10 } : {}; break; }
 case 'collect': if (!s.expedition || now < s.expedition.endsAt) return 'Expedition still travelling'; if (s.expedition.choice === null) return 'Resolve the expedition encounter first'; break;
 case 'engine': { const step = ENGINE_STEPS[s.engineStep]; if (!step || stage(s) < 2) return 'Aetherport required'; if (!s.blueprints.includes(step.blueprint)) return `Requires ${step.blueprint} blueprint`; if (step.artifact && !s.artifact) return 'Recover the ancient core from The Sunken Foundry'; cost = step.cost; break; }
 case 'event': if (!s.eventActive) return 'No active city event'; { const option = CITY_EVENTS[s.eventIndex % CITY_EVENTS.length]?.options[a.index]; if (!option) return 'Unknown choice'; cost = option.cost; } break;
 }
 const missing = shortage(s, cost); return missing ? `Need ${missing}` : '';
}
export function cityAction(s: CityState, a: CityAction, now = Date.now()): CityState {
 const reason = actionReason(s, a, now); if (reason) return { ...s, notice: reason };
 let next = s;
 switch (a.type) {
 case 'click': next = grant(s, { coins: 2 }); break;
 case 'construct': next = pay(s, BUILDINGS[a.kind].cost); next = { ...next, plots: next.plots.map((p, i) => i === a.plot ? { kind: a.kind, level: 1 } : p) }; break;
 case 'upgrade': { const p = s.plots[a.plot]; if (!p) return s; next = pay(s, upgradeCost(p)); next = { ...next, plots: next.plots.map((q, i) => i === a.plot ? { ...p, level: p.level + 1 } : q) }; break; }
 case 'demolish': { const p = s.plots[a.plot]; if (!p) return s; next = grant(s, Object.fromEntries(Object.entries(BUILDINGS[p.kind].cost).map(([k, n]) => [k, Math.floor(n * BALANCE.demolitionRefund)]))); next = { ...next, plots: next.plots.map((q, i) => i === a.plot ? null : q) }; next.resources.steam = Math.min(next.resources.steam, steamCapacity(next)); break; }
 case 'contract': { const c = CONTRACTS.find(c => c.id === a.id); if (!c) return s; next = grant(pay(s, c.cost), c.reward); next = { ...next, contracts: [...s.contracts, c.id], permits: c.permit ? [...s.permits, c.permit] : s.permits, blueprints: c.blueprint ? [...new Set([...s.blueprints, c.blueprint])] : s.blueprints }; break; }
 case 'technology': { const t = TECHNOLOGIES.find(t => t.id === a.id); if (!t) return s; next = { ...pay(s, t.cost), technologies: [...s.technologies, t.id] }; break; }
 case 'launch': { const d = DESTINATIONS[a.index]; if (!d) return s; next = { ...pay(s, d.cost), expedition: { destination: a.index, endsAt: now + d.duration * 1000 * (s.technologies.includes('airships') ? .75 : 1), choice: null } }; break; }
 case 'expeditionChoice': { const e = s.expedition; if (!e) return s; next = pay(s, a.index === 0 ? e.destination === 1 ? { steam: 10 } : { gears: e.destination === 2 ? 15 : 10 } : {}); next = { ...next, expedition: { ...e, choice: a.index } }; break; }
 case 'collect': { const e = s.expedition; if (!e) return s; const d = DESTINATIONS[e.destination]; if (!d) return s; const full = e.choice === 0; next = grant(s, Object.fromEntries(Object.entries(d.reward).map(([k, n]) => [k, full ? n : Math.floor(n / 2)]))); next = { ...next, expedition: null, expeditionCount: s.expeditionCount + 1, blueprints: full ? [...new Set([...s.blueprints, d.blueprint])] : s.blueprints, artifact: s.artifact || (full && d.artifact), notice: `${d.name} returned: ${full ? costText(d.reward) + ' · ' + d.blueprint + ' blueprint' : 'Half cargo recovered; no blueprint'}` }; return next; }
 case 'engine': next = { ...pay(s, ENGINE_STEPS[s.engineStep]?.cost ?? {}), engineStep: s.engineStep + 1, victory: s.engineStep === ENGINE_STEPS.length - 1 }; break;
 case 'event': { const e = CITY_EVENTS[s.eventIndex % CITY_EVENTS.length]?.options[a.index]; if (!e) return s; next = { ...grant(pay(s, e.cost), e.reward), eventIndex: s.eventIndex + 1, eventActive: false, eventDue: s.elapsed + BALANCE.eventInterval }; break; }
 case 'demo': next = { ...freshCity(now), demo: true, resources: { coins: 2500, gears: 700, steam: 180, crystals: 40, research: 300 }, earned: 2500, permits: ['industrial', 'aetherport'], contracts: ['gears', 'steam', 'assembly', 'sky'], technologies: ['boilers', 'automation', 'airships'], blueprints: ['hull'], plots: [{ kind: 'workshop', level: 3 }, { kind: 'boiler', level: 3 }, { kind: 'factory', level: 2 }, { kind: 'laboratory', level: 2 }, { kind: 'dock', level: 1 }, ...Array.from({ length: 7 }, () => null)] }; break;
 }
 return { ...next, notice: a.type === 'click' ? '+2 Brass Coins' : 'Ledger updated.' };
}
