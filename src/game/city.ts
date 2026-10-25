import { BALANCE, BUILDINGS, CITY_EVENTS, cityEvent, CONTRACTS, DESTINATIONS, ENGINE_STEPS, SHORTAGE_PENALTY, UNION, TECHNOLOGIES, PLOT_TECHNOLOGIES, RESOURCE_NAMES, LEVEL_OUTPUT, UPGRADE_COST, PRODUCTION_ORDER, type BuildingKind, type Cost, type Resource, type Stock } from './city-config';
import { withActionFeedback, withFeedback, type ActionFeedback } from './action-feedback';
export interface Plot { kind: BuildingKind; level: number }
export interface Expedition { destination: number; endsAt: number; choice: number | null }
export interface PendingWalkout { plot: number; dueAt: number; eventIndex: number }
export interface ProductionSample { output: Stock; input: Stock; seconds: number; paused: string[] }
export interface CityEventInstance { eventIndex: number; eventPlot: number | null }
export interface UnlockNotice { id: number; message: string; detail: string }
export interface ContractCombo { id: number; count: number; completedAt: number }
export interface CityContent { knownResearch: string[]; knownContracts: string[]; viewedResearch: string[]; viewedContracts: string[]; unlockNotices: UnlockNotice[]; unlockNoticeId: number }
export interface CityState extends CityContent { secondEvent: CityEventInstance | null; eventCursor: number | null; nextEventDue: number | null; contractCombo: ContractCombo | null }
function newContent(): CityContent & { contractCombo: ContractCombo | null } { return { knownResearch: ['boilers'], knownContracts: ['gears', 'firstscience', 'firstthousand'], viewedResearch: [], viewedContracts: [], unlockNotices: [], unlockNoticeId: 0, contractCombo: null }; }
export interface CityState { resources: Stock; completedContracts: string[]; firstResearch: boolean; peakCoins: number; contractCompletionId: number; unlockedPlots: number; traderTransactions: number; hasBuiltOilRig: boolean; lastProduction: ProductionSample | null; earned: number; plots: (Plot | null)[]; contracts: string[]; emergenciesResolved: number; permits: string[]; technologies: string[]; blueprints: string[]; artifact: boolean; expedition: Expedition | null; expeditionCount: number; engineStep: number; eventIndex: number; eventDue: number; eventActive: boolean; elapsed: number; lastSaved: number; demo: boolean; victory: boolean; notice: string; damagedPlots: number[]; eventPlot: number | null; shortageSeconds: number; pendingWalkout: PendingWalkout | null; actionFeedback: ActionFeedback | null }
function emptyStock(): Stock { return { coins: 0, gears: 0, steam: 0, crystals: 0, research: 0, oil: 0 }; }
export function freshCity(now = Date.now()): CityState { return { ...newContent(), secondEvent: null, eventCursor: null, nextEventDue: null, resources: { ...emptyStock(), coins: BALANCE.startingCoins, gears: BALANCE.startingGears, steam: BALANCE.startingSteam }, completedContracts: [], firstResearch: false, peakCoins: BALANCE.startingCoins, contractCompletionId: 0, unlockedPlots: 2, traderTransactions: 0, hasBuiltOilRig: false, lastProduction: null, earned: 0, plots: Array.from({ length: 12 }, () => null), contracts: [], emergenciesResolved: 0, permits: [], technologies: [], blueprints: [], artifact: false, expedition: null, expeditionCount: 0, engineStep: 0, eventIndex: 0, eventDue: BALANCE.eventInterval, eventActive: false, damagedPlots: [], eventPlot: null, shortageSeconds: 0, pendingWalkout: null, actionFeedback: null, elapsed: 0, lastSaved: now, demo: false, victory: false, notice: 'YOUR INDUSTRIAL EMPIRE STARTS HERE. Construct an Oil Rig to generate oil and passive Brass Coins.' }; }
function shortageMultiplier(s: CityState, kind: BuildingKind) { return s.shortageSeconds > 0 && (BUILDINGS[kind].output.gears ?? 0) > 0 ? SHORTAGE_PENALTY.outputMultiplier : 1; }
export function isBreakdown(s: CityState) { const event = CITY_EVENTS[s.eventIndex % CITY_EVENTS.length]; return Boolean(event && 'id' in event && event.id === 'equipment-breakdown'); }
export function isUnion(s: CityState) { const event = cityEvent(s.eventIndex); return Boolean(event && 'id' in event && event.id === 'worker-union'); }
export function operating(s: CityState, index: number) { return Boolean(s.plots[index]) && !s.damagedPlots.includes(index); }
function activeBoilerAdjacent(s: CityState, index: number) { return s.plots.some((p, i) => p?.kind === 'boiler' && operating(s, i) && Math.floor(i / 4) === Math.floor(index / 4) && Math.abs(i - index) === 1); }
function activatePrimaryEvent(s: CityState, randomRoll: number): CityState {
 if (!s.eventActive && s.elapsed < s.eventDue) return s;
 if (isUnion(s) && s.technologies.includes('ununionizer')) return preventUnion(s);
 if (!isBreakdown(s) && !isUnion(s)) return s.eventActive ? s : { ...s, eventActive: true };
 if (s.eventActive && s.eventPlot !== null) return s;
 const reserved = interactiveEvents(s).filter(e => e.eventIndex !== s.eventIndex).map(e => e.eventPlot);
 const candidates = s.plots.flatMap((p, i) => p && operating(s, i) && !reserved.includes(i) && s.pendingWalkout?.plot !== i && Object.keys(BUILDINGS[p.kind].output).length > 0 ? [i] : []);
 const plot = candidates[Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(1, randomRoll)) * candidates.length))];
 if (plot === undefined) return { ...s, eventActive: false, eventPlot: null, eventIndex: followingEvent(s), eventDue: s.elapsed + BALANCE.eventInterval, notice: `${isUnion(s) ? 'Union dispute' : 'Equipment breakdown'} avoided: no operating production buildings.` };
 const building = s.plots[plot];
 if (isUnion(s)) return { ...s, eventActive: true, eventPlot: plot, notice: `${building ? BUILDINGS[building.kind].name : 'Workplace'} on plot ${plot + 1}: workers demand fair wages. Production continues while you decide.` };
 return { ...s, eventActive: true, eventPlot: plot, damagedPlots: [...s.damagedPlots, plot], notice: `${building ? BUILDINGS[building.kind].name : 'Machine'} on plot ${plot + 1} has broken down. Production is paused.` };
}
export function interactiveEvents(s: CityState): CityEventInstance[] {
 return [...(s.eventActive ? [{ eventIndex: s.eventIndex, eventPlot: s.eventPlot }] : []), ...(s.secondEvent ? [s.secondEvent] : [])];
}
export function eventState(s: CityState, event: CityEventInstance): CityState {
 return { ...s, eventIndex: event.eventIndex, eventPlot: event.eventPlot, eventActive: true };
}
function activateEvent(state: CityState, randomRoll: number): CityState {
 let s = state;
 if (s.secondEvent) return s;
 if (!s.eventActive) {
  s = activatePrimaryEvent(s, randomRoll);
  if (s.eventActive && s.nextEventDue === null) s = { ...s, eventCursor: followingEvent(s), nextEventDue: s.elapsed + BALANCE.eventInterval };
  return s;
 }
 if (s.nextEventDue === null) return { ...activatePrimaryEvent(s, randomRoll), eventCursor: followingEvent(s), nextEventDue: s.elapsed + BALANCE.eventInterval };
 if (s.elapsed + 1e-8 < s.nextEventDue) return s;
 const index = s.eventCursor ?? followingEvent(s);
 const candidate = activatePrimaryEvent({ ...s, eventIndex: index, eventPlot: null, eventActive: false, eventDue: s.elapsed,
  secondEvent: { eventIndex: s.eventIndex, eventPlot: s.eventPlot } }, randomRoll);
 const nextIndex = candidate.eventActive ? followingEvent(candidate) : candidate.eventIndex;
 return { ...s, damagedPlots: candidate.damagedPlots, eventCursor: nextIndex, nextEventDue: candidate.eventActive ? null : s.elapsed + BALANCE.eventInterval,
  secondEvent: candidate.eventActive ? { eventIndex: index, eventPlot: candidate.eventPlot } : null };
}
function resolveInteractive(s: CityState): CityState {
 const first = s.secondEvent;
 return first ? { ...s, ...first, secondEvent: null, eventActive: true, nextEventDue: s.elapsed + BALANCE.eventInterval }
  : { ...s, eventActive: false, eventPlot: null, eventIndex: s.eventCursor ?? followingEvent(s), eventCursor: null, nextEventDue: null, eventDue: s.elapsed + BALANCE.eventInterval };
}
function processWalkout(s: CityState): CityState {
 if (s.technologies.includes('ununionizer')) s = preventUnion(s);
 const pending = s.pendingWalkout;
 if (!pending || pending.dueAt > s.elapsed + 1e-8) return s;
 const building = s.plots[pending.plot];
 if (!building) throw new Error('Pending walkout has no workplace');
 const next = { ...s, resources: { ...s.resources }, plots: s.plots.map((p, i) => i === pending.plot ? null : p), damagedPlots: s.damagedPlots.filter(i => i !== pending.plot), eventPlot: s.eventPlot === pending.plot ? null : s.eventPlot, pendingWalkout: null, notice: `${BUILDINGS[building.kind].name} on plot ${pending.plot + 1} was lost after the workers walked out. No refund was granted; the plot is available for rebuilding.` };
 next.resources.steam = Math.min(next.resources.steam, steamCapacity(next));
 return withFeedback(s, next, { message: 'WORKERS HAVE WALKED!', quote: 'No wages, no work.', category: 'walkout', effect: 'red-vignette' });
}
export function stage(s: CityState) { return s.permits.includes('aetherport') ? 2 : s.permits.includes('industrial') ? 1 : 0; }
export function permitName(level: number) { return level === 2 ? 'Aetherport Permit' : 'Industrial Permit'; }
export function plotLimit(s: CityState) { return s.unlockedPlots; }
export function nextPlotTechnology(s: CityState) { return PLOT_TECHNOLOGIES.find(t => t.unlockPlot === plotLimit(s) + 1); }
export function steamCapacity(s: CityState) { return BALANCE.baseSteamCapacity + (s.technologies.includes('reservoir') ? 90 : 0) + s.plots.reduce((n, p) => n + (p && ['boiler', 'steamrig'].includes(p.kind) ? BALANCE.boilerCapacity * p.level : 0), 0); }
// Also used when loading saves so researched prevention cannot leave an armed walkout.
export function preventUnion(s: CityState): CityState {
 if (!s.technologies.includes('ununionizer')) return s;
 const removedSecond = s.secondEvent && isUnion(eventState(s, s.secondEvent));
 s = { ...s, secondEvent: removedSecond ? null : s.secondEvent, nextEventDue: removedSecond ? s.elapsed + BALANCE.eventInterval : s.nextEventDue, eventCursor: s.eventCursor !== null && isUnion({ ...s, eventIndex: s.eventCursor }) ? s.eventCursor + 1 : s.eventCursor };
 const union = isUnion(s);
 if (!union && s.pendingWalkout === null) return s;
 return { ...(union && s.eventActive ? resolveInteractive(s) : union ? { ...s, eventIndex: s.eventIndex + 1, eventActive: false, eventPlot: null, eventDue: s.elapsed + BALANCE.eventInterval } : s), pendingWalkout: null, notice: 'The Un-Unionizer 9000 prevented a union dispute. No workplace was lost.' };
}
function followingEvent(s: CityState) { const index = s.eventIndex + 1; return s.technologies.includes('ununionizer') && isUnion({ ...s, eventIndex: index }) ? index + 1 : index; }
export function shortage(s: CityState, cost: Cost) { return Object.entries(cost).filter(([k, n]) => s.resources[k as Resource] + 1e-8 < n).map(([k, n]) => `${Math.ceil(n - s.resources[k as Resource])} ${RESOURCE_NAMES[k as Resource]}`).join(', '); }
export function costText(cost: Cost) { return Object.entries(cost).map(([k, n]) => `${n} ${RESOURCE_NAMES[k as Resource]}`).join(' · '); }
export function eventTerms(s: CityState, index: number) {
 const option = cityEvent(s.eventIndex)?.options[index];
 const cost: Cost = option?.cost ?? {}; const reward: Cost = option?.reward ?? {};
 const riskReward: Cost = option && 'risk' in option ? option.risk.reward : {};
 if (!option || !('character' in option)) return { cost, reward, riskReward };
 const discount = (value: Cost): Cost => Object.fromEntries(Object.entries(value).map(([k, n]) => [k, n > 0 ? Math.max(1, Math.ceil(n * .8)) : 0]));
 const bonus = (value: Cost): Cost => Object.fromEntries(Object.entries(value).map(([k, n]) => [k, Math.floor(n * 1.25)]));
 return { cost: s.technologies.includes('fineprint') ? discount(cost) : cost, reward: s.technologies.includes('bargain') ? bonus(reward) : reward, riskReward: s.technologies.includes('bargain') ? bonus(riskReward) : riskReward };
}
function pay(s: CityState, cost: Cost): CityState { const resources = { ...s.resources }; for (const [k, n] of Object.entries(cost)) resources[k as Resource] = Math.max(0, resources[k as Resource] - n); return { ...s, resources }; }
function grant(s: CityState, reward: Cost): CityState { const resources = { ...s.resources }; for (const [k, n] of Object.entries(reward)) resources[k as Resource] += n; resources.steam = Math.min(resources.steam, steamCapacity(s)); return { ...s, resources, peakCoins: Math.max(s.peakCoins, resources.coins), earned: s.earned + (reward.coins ?? 0) }; }
export function upgradeCost(p: Plot): Cost { const multiplier = UPGRADE_COST[p.level - 1] ?? 0; return Object.fromEntries(Object.entries(BUILDINGS[p.kind].cost).map(([k, n]) => [k, Math.ceil(n * multiplier)])); }
export function buildingRates(s: CityState, p: Plot, index: number) {
 const b = BUILDINGS[p.kind]; const output = emptyStock(); const speed = s.technologies.includes('whirr') ? 1.05 : 1;
 const input: Stock = { ...emptyStock(), ...Object.fromEntries(Object.entries(b.input).map(([k, n]) => [k, n * speed])) };
 const synergy = activeBoilerAdjacent(s, index) && ['factory', 'bakery'].includes(p.kind) ? 1.25 : 1;
 for (const [k, n] of Object.entries(b.output)) {
  let multiplier = (LEVEL_OUTPUT[p.level - 1] ?? 1) * synergy * shortageMultiplier(s, p.kind);
  if (['boiler', 'steamrig'].includes(p.kind) && s.technologies.includes('boilers')) multiplier *= 1.5;
  if (k === 'gears' && s.technologies.includes('automation')) multiplier *= 1.5;
  output[k as Resource] = n * multiplier * speed;
 }
 return { output, input };
}
function produce(state: CityState, dt: number, track = false, now = 0) {
 let s = state; const output = emptyStock(); const input = emptyStock(); const generated = emptyStock(); const paused = new Set<string>();
 const ordered = s.plots.map((p, i) => ({ p, i })).sort((a, b) => (a.p ? PRODUCTION_ORDER.indexOf(a.p.kind) : 99) - (b.p ? PRODUCTION_ORDER.indexOf(b.p.kind) : 99));
 for (const { p, i } of ordered) {
  if (!p || !operating(s, i)) continue;
  const rates = buildingRates(s, p, i);
  const consumption = Object.fromEntries(Object.entries(rates.input).map(([k, n]) => [k, n * dt]));
  const missing = shortage(s, consumption);
  if (missing) { paused.add(`${BUILDINGS[p.kind].name} paused: needs ${missing}`); continue; }
  s = pay(s, consumption);
  const before = s.resources;
  s = grant(s, Object.fromEntries(Object.entries(rates.output).map(([k, n]) => [k, n * dt])));
  if (track) s = trackContractCompletions(s, true, now);
  for (const k of Object.keys(output) as Resource[]) { output[k] += s.resources[k] - before[k]; input[k] += rates.input[k] * dt; generated[k] += rates.output[k] * dt; }
 }
 return { state: s, output, input, generated, paused: [...paused] };
}
// Preview current supplier/input availability, not a stale interval or capped storage gain.
export function activeProduction(s: CityState) { return produce(s, 1).generated; }
export function production(s: CityState) {
 const output = emptyStock(); const input = emptyStock(); const shortages: string[] = [];
 s.plots.forEach((p, i) => { if (!p || !operating(s, i)) return; const rates = buildingRates(s, p, i); for (const k of Object.keys(output) as Resource[]) { output[k] += rates.output[k]; input[k] += rates.input[k]; } });
 for (const k of Object.keys(input) as Resource[]) if (input[k] > output[k] + 1e-8) shortages.push(`${RESOURCE_NAMES[k]} demand exceeds production`);
 const sample = s.lastProduction ?? { ...produce(s, 1), seconds: 1 };
 const effectiveOutput = emptyStock(); const effectiveInput = emptyStock();
 for (const k of Object.keys(output) as Resource[]) { effectiveOutput[k] = sample.output[k] / sample.seconds; effectiveInput[k] = sample.input[k] / sample.seconds; }
 return { output, input, effectiveOutput, effectiveInput, shortages: [...new Set([...shortages, ...sample.paused])], measured: s.lastProduction !== null };
}
export function advanceCity(state: CityState, seconds: number, randomRoll = 0, now = Date.now()): CityState {
 let s = activateEvent(processWalkout({ ...state, resources: { ...state.resources } }), randomRoll); let remaining = Math.max(0, Math.min(seconds, BALANCE.offlineCap));
 const sample: ProductionSample = { output: emptyStock(), input: emptyStock(), seconds: remaining, paused: [] };
 // Suppliers run first, and no machine can borrow future supplies.
 while (remaining > .00001) { const dt = Math.min(1, remaining, s.eventActive ? (s.nextEventDue ?? Infinity) - s.elapsed : s.eventDue - s.elapsed, s.shortageSeconds > 0 ? s.shortageSeconds : Infinity, s.pendingWalkout ? s.pendingWalkout.dueAt - s.elapsed : Infinity); remaining -= dt;
 const produced = produce(s, dt, true, now); s = produced.state;
 for (const k of Object.keys(sample.output) as Resource[]) { sample.output[k] += produced.output[k]; sample.input[k] += produced.input[k]; }
 sample.paused = [...new Set([...sample.paused, ...produced.paused])];
 s = activateEvent(processWalkout({ ...s, elapsed: s.elapsed + dt, shortageSeconds: Math.max(0, s.shortageSeconds - dt) }), randomRoll);
 }
 s = reconcileContent(trackContractCompletions(s, true, now));
 return sample.seconds > 0 ? { ...s, lastProduction: sample } : s;
}
export type CityAction = { type: 'construct'; plot: number; kind: BuildingKind } | { type: 'upgrade' | 'demolish'; plot: number } | { type: 'contract' | 'technology'; id: string } | { type: 'launch' | 'expeditionChoice'; index: number } | { type: 'event'; index: number; eventIndex?: number; randomRoll?: number } | { type: 'declineTrade'; eventIndex: number } | { type: 'viewContent'; category: 'research' | 'contracts'; id: string } | { type: 'dismissUnlock'; id: number } | { type: 'dockRequired' | 'collect' | 'engine' | 'demo' | 'reset' };
type Contract = typeof CONTRACTS[number];
export function contractNeedsGuild(c: Contract) { return !['gears', 'maintenance', 'crude', 'firstvoyage', 'firstscience', 'firstthousand'].includes(c.id); }
export function contractProgress(s: CityState, c: Contract) {
 if ('requiredEmergencies' in c) return { label: 'Emergencies resolved', value: s.emergenciesResolved, target: c.requiredEmergencies };
 if (!('objective' in c)) return null;
 const o = c.objective;
 const values = { trades: s.traderTransactions, plots: plotLimit(s), expeditions: s.expeditionCount, technologies: TECHNOLOGIES.filter(t => !('unlockPlot' in t) && s.technologies.includes(t.id)).length, firstResearch: s.firstResearch ? 1 : 0, coinBalance: Math.max(s.peakCoins, s.resources.coins) };
 const labels = { trades: 'Trader transactions', plots: 'Unlocked plots', expeditions: 'Expeditions collected', technologies: 'Industrial research topics', firstResearch: 'Research purchased', coinBalance: 'Highest coin balance' };
 return { label: labels[o.kind], value: values[o.kind], target: o.target };
}
export function hasAirshipDock(s: CityState) { return s.plots.some((p, i) => i < plotLimit(s) && p?.kind === 'dock'); }
export function contractLockReason(s: CityState, c: Contract): string {
 if (c.stage > stage(s)) return `${permitName(c.stage)} Required`;
 if (c.id === 'crude' && !s.hasBuiltOilRig) return 'Construct your first Oil Rig';
 if (contractNeedsGuild(c) && !s.contracts.includes('gears')) return 'Complete The Tinkers’ Guild first';
 if (c.id === 'sky' && (!s.technologies.includes('airships') || !s.blueprints.includes('hull'))) return 'Requires Improved Airships and a hull blueprint';
 if ((c.id === 'firstvoyage' || c.id === 'tourist') && s.expeditionCount === 0 && !hasAirshipDock(s)) return 'Construct an Airship Dock first';
 return '';
}
export function researchLockReason(s: CityState, t: typeof TECHNOLOGIES[number]): string {
 if ('unlockPlot' in t) {
  if (t.unlockPlot <= plotLimit(s)) return 'Plot already unlocked';
  if (t.unlockPlot !== plotLimit(s) + 1) return `Unlock Plot ${plotLimit(s) + 1} first`;
  if (!s.hasBuiltOilRig) return 'Construct your first Oil Rig';
 } else {
  if (stage(s) < t.stage) return `${permitName(t.stage)} Required`;
  if (t.requires && !s.technologies.includes(t.requires)) return `Requires ${TECHNOLOGIES.find(p => p.id === t.requires)?.name}`;
 }
 return '';
}
export function availableContracts(s: CityState) { return CONTRACTS.filter(c => !s.contracts.includes(c.id) && !contractLockReason(s,c)); }
export function availableResearch(s: CityState) { return TECHNOLOGIES.filter(t => !s.technologies.includes(t.id) && !researchLockReason(s,t)); }
export function reconcileContent(state: CityState, notify = true): CityState {
 const research = availableResearch(state).filter(t => !state.knownResearch.includes(t.id));
 const contracts = availableContracts(state).filter(c => !state.knownContracts.includes(c.id));
 const id = state.unlockNoticeId + 1;
 const notice = { id, message: research.length && contracts.length ? 'NEW RESEARCH AND CONTRACTS UNLOCKED!' : research.length ? 'NEW RESEARCH UNLOCKED!' : 'NEW CONTRACTS UNLOCKED!',
  detail: [...research.map(t => t.name), ...contracts.map(c => c.title)].join(' · ') };
 const changed = research.length + contracts.length > 0;
 return { ...state, knownResearch: [...state.knownResearch, ...research.map(t=>t.id)], knownContracts: [...state.knownContracts,...contracts.map(c=>c.id)],
  unlockNoticeId: notify && changed ? id : state.unlockNoticeId, unlockNotices: notify && changed ? [state.unlockNotices[0] ? {
   ...notice, message: new Set([state.unlockNotices[0].message, notice.message]).size > 1 ? 'NEW RESEARCH AND CONTRACTS UNLOCKED!' : notice.message,
   detail: `${state.unlockNotices[0].detail} · ${notice.detail}`,
  } : notice] : state.unlockNotices };
}
export function contractStatus(s: CityState, c: Contract) {
 if (s.contracts.includes(c.id)) return 'Claimed';
 if (s.completedContracts.includes(c.id)) return actionReason(s, { type: 'contract', id: c.id }) ? 'Completed · Delivery required' : 'Completed · Ready to claim';
 if (contractLockReason(s, c)) return 'Locked';
 return actionReason(s, { type: 'contract', id: c.id }) ? 'In progress' : 'Completed · Ready to claim';
}
export function contractComplete(s: CityState, c: Contract) {
 return s.contracts.includes(c.id) || s.completedContracts.includes(c.id) || !actionReason(s, { type: 'contract', id: c.id });
}
export function trackContractCompletions(state: CityState, notify = true, now = Date.now()): CityState {
 const s = { ...state, peakCoins: Math.max(state.peakCoins, state.resources.coins) };
 const newly = CONTRACTS.filter(c => !s.contracts.includes(c.id) && !s.completedContracts.includes(c.id) && !actionReason(s, { type: 'contract', id: c.id }));
 const completedContracts = [...new Set([...s.completedContracts, ...s.contracts, ...newly.map(c => c.id)])];
 const changed = notify && newly.length > 0;
 const previous = s.contractCombo;
 const continuing = previous && now >= previous.completedAt && now - previous.completedAt < 2000;
 return { ...s, completedContracts, contractCompletionId: s.contractCompletionId + (changed ? 1 : 0),
  contractCombo: changed ? { id: s.contractCompletionId + 1, count: (continuing ? previous.count : 0) + newly.length, completedAt: now } : previous };
}
export function actionReason(s: CityState, a: CityAction, now = Date.now()): string {
 if ((a.type === 'event' || a.type === 'declineTrade') && a.eventIndex !== undefined && a.eventIndex !== s.eventIndex) {
  const event = s.secondEvent?.eventIndex === a.eventIndex ? s.secondEvent : null;
  return event ? actionReason({ ...eventState(s, event), secondEvent: null }, a, now) : 'No active city event';
 }
 let cost: Cost = {};
 switch (a.type) {
 case 'construct': if (!Number.isInteger(a.plot) || a.plot < 0 || a.plot >= plotLimit(s) || s.plots[a.plot]) return 'Select an empty unlocked plot'; if (!s.hasBuiltOilRig && a.kind !== 'oilrig') return 'Construct your first Oil Rig to unlock other buildings'; if (BUILDINGS[a.kind].stage > stage(s)) return `${permitName(BUILDINGS[a.kind].stage)} Required`; cost = BUILDINGS[a.kind].cost; break;
 case 'upgrade': { const p = s.plots[a.plot]; if (!p) return 'Select a building'; if (s.damagedPlots.includes(a.plot)) return 'Building damaged'; if (interactiveEvents(s).some(e => isUnion(eventState(s,e)) && e.eventPlot === a.plot) || s.pendingWalkout?.plot === a.plot) return 'Resolve the union dispute first'; if (p.level >= BALANCE.maxLevel) return 'Maximum level reached'; cost = upgradeCost(p); break; }
 case 'demolish': if (!s.plots[a.plot]) return 'Select a building'; if (s.damagedPlots.includes(a.plot)) return 'Building damaged'; if (interactiveEvents(s).some(e => isUnion(eventState(s,e)) && e.eventPlot === a.plot) || s.pendingWalkout?.plot === a.plot) return 'Resolve the union dispute first'; break;
 case 'contract': { const c = CONTRACTS.find(c => c.id === a.id); if (!c || s.contracts.includes(a.id)) return 'Contract unavailable'; const locked = contractLockReason(s, c); if (locked) return locked; if (s.earned < c.earned) return `Earn ${Math.ceil(c.earned - s.earned)} more lifetime coins`; if ('requiredEmergencies' in c && s.emergenciesResolved < c.requiredEmergencies) return `Resolve ${c.requiredEmergencies - s.emergenciesResolved} more city emergencies`; const progress = contractProgress(s, c); if (progress && progress.value < progress.target) return `${progress.label}: ${progress.value}/${progress.target}`; cost = c.cost; break; }
 case 'technology': {
  const t = TECHNOLOGIES.find(t => t.id === a.id); if (!t || s.technologies.includes(a.id)) return 'Technology unavailable';
  const locked = researchLockReason(s,t); if (locked) return locked;
  cost = t.cost; break;
 }
 case 'launch': { const d = DESTINATIONS[a.index]; if (!d) return 'Unknown destination'; if (s.expedition) return 'Airship already on expedition'; if (!hasAirshipDock(s)) return 'Construct an Airship Dock first'; if (!s.plots.some((p, i) => i < plotLimit(s) && p?.kind === 'dock' && operating(s, i))) return 'Restore an operating Airship Dock first'; cost = d.cost; break; }
 case 'expeditionChoice': { const e = s.expedition; if (!e || e.choice !== null || ![0, 1].includes(a.index)) return 'No pending expedition choice'; const d = DESTINATIONS[e.destination]; if (!d) return 'Unknown expedition'; if (now < e.endsAt - d.duration * 1000 / 2) return 'Event encountered halfway through the voyage'; cost = a.index === 0 ? e.destination === 1 ? { steam: 10 } : { gears: e.destination === 2 ? 15 : 10 } : {}; break; }
 case 'collect': if (!s.expedition || now < s.expedition.endsAt) return 'Expedition still travelling'; if (s.expedition.choice === null) return 'Resolve the expedition encounter first'; break;
 case 'engine': { const step = ENGINE_STEPS[s.engineStep]; if (!step) return 'Great Engine complete'; if (stage(s) < 2) return 'Aetherport Permit Required'; if (!s.blueprints.includes(step.blueprint)) return `Requires ${step.blueprint} blueprint`; if (step.artifact && !s.artifact) return 'Recover the ancient core from The Sunken Foundry'; cost = step.cost; break; }
 case 'event': if (!s.eventActive || (a.eventIndex !== undefined && a.eventIndex !== s.eventIndex) || (isUnion(s) && s.technologies.includes('ununionizer'))) return 'No active city event'; { const option = cityEvent(s.eventIndex)?.options[a.index]; if (!option) return 'Unknown choice'; if ('risk' in option && a.randomRoll !== undefined && (!Number.isFinite(a.randomRoll) || a.randomRoll < 0 || a.randomRoll >= 1)) return 'Trade outcome unavailable; try again'; if (isBreakdown(s) && (s.eventPlot === null || !s.plots[s.eventPlot] || !s.damagedPlots.includes(s.eventPlot))) return 'No damaged building selected'; if (isUnion(s) && (s.eventPlot === null || !operating(s, s.eventPlot) || s.pendingWalkout !== null)) return 'No available union workplace'; cost = eventTerms(s, a.index).cost; } break;
 case 'declineTrade': return s.eventActive && s.eventIndex === a.eventIndex && cityEvent(s.eventIndex)?.title === 'Travelling brass merchant' ? '' : 'No active trader offer';
 case 'viewContent': return (a.category === 'research' ? availableResearch(s) : availableContracts(s)).some(item => item.id === a.id) ? '' : 'Content unavailable';
 case 'dismissUnlock': return s.unlockNotices[0]?.id === a.id ? '' : 'Notification unavailable';
 case 'dockRequired': return '';
 }
 if (!s.hasBuiltOilRig && (cost.coins ?? 0) > 0 && !(a.type === 'construct' && a.kind === 'oilrig')) return 'Reserve your Brass Coins for the first Oil Rig';
 const missing = shortage(s, cost); return missing ? `Need ${missing}` : '';
}
export function cityAction(s: CityState, a: CityAction, now = Date.now()): CityState {
 const reason = actionReason(s, a, now); if (reason) return { ...s, notice: reason };
 if ((a.type === 'event' || a.type === 'declineTrade') && a.eventIndex !== undefined && a.eventIndex !== s.eventIndex) {
  const event = s.secondEvent;
  if (!event) return s;
  const result = cityAction({ ...eventState(s, event), secondEvent: null, nextEventDue: null, eventCursor: null }, a, now);
  return { ...result, eventIndex: s.eventIndex, eventPlot: s.eventPlot, eventActive: s.eventActive, eventDue: s.eventDue,
   eventCursor: s.eventCursor, nextEventDue: s.elapsed + BALANCE.eventInterval, secondEvent: null };
 }
 if (a.type === 'viewContent') {
  const key = a.category === 'research' ? 'viewedResearch' : 'viewedContracts';
  return s[key].includes(a.id) ? s : { ...s, [key]: [...s[key], a.id] };
 }
 if (a.type === 'dismissUnlock') return { ...s, unlockNotices: s.unlockNotices.slice(1) };
 if (a.type === 'dockRequired') return withFeedback(s, s, { message: 'AIRSHIP DOCK REQUIRED!', detail: 'You need to unlock the Airship Dock on a plot first.' });
 if (a.type === 'declineTrade') return withFeedback(s, resolveInteractive(s), { message: 'OFFER DECLINED!', detail: 'Not today. My money is safer in my pocket.' });
 if (a.type === 'event' && a.randomRoll === undefined && 'risk' in (cityEvent(s.eventIndex)?.options[a.index] ?? {})) return { ...s, notice: 'Trade outcome unavailable; try again' };
 s = reconcileContent(trackContractCompletions(s, false), false);
 let next = s;
 switch (a.type) {
 case 'construct': next = pay(s, BUILDINGS[a.kind].cost); next = { ...next, hasBuiltOilRig: s.hasBuiltOilRig || a.kind === 'oilrig', plots: next.plots.map((p, i) => i === a.plot ? { kind: a.kind, level: 1 } : p) }; break;
 case 'upgrade': { const p = s.plots[a.plot]; if (!p) return s; next = pay(s, upgradeCost(p)); next = { ...next, plots: next.plots.map((q, i) => i === a.plot ? { ...p, level: p.level + 1 } : q) }; break; }
 case 'demolish': { const p = s.plots[a.plot]; if (!p) return s; next = grant(s, Object.fromEntries(Object.entries(BUILDINGS[p.kind].cost).map(([k, n]) => [k, Math.floor(n * BALANCE.demolitionRefund)]))); next = { ...next, plots: next.plots.map((q, i) => i === a.plot ? null : q) }; next.resources.steam = Math.min(next.resources.steam, steamCapacity(next)); break; }
 case 'contract': { const c = CONTRACTS.find(c => c.id === a.id); if (!c) return s; next = grant(pay(s, c.cost), c.reward); next = { ...next, contracts: [...s.contracts, c.id], permits: c.permit ? [...s.permits, c.permit] : s.permits, blueprints: c.blueprint ? [...new Set([...s.blueprints, c.blueprint])] : s.blueprints }; break; }
 case 'technology': { const t = TECHNOLOGIES.find(t => t.id === a.id); if (!t) return s; next = { ...pay(s, t.cost), firstResearch: true, technologies: [...s.technologies, t.id], unlockedPlots: 'unlockPlot' in t ? t.unlockPlot : s.unlockedPlots }; if (t.id === 'ununionizer') next = preventUnion(next); break; }
 case 'launch': { const d = DESTINATIONS[a.index]; if (!d) return s; next = { ...pay(s, d.cost), expedition: { destination: a.index, endsAt: now + d.duration * 1000 * (s.technologies.includes('airships') ? .75 : 1), choice: null } }; break; }
 case 'expeditionChoice': { const e = s.expedition; if (!e) return s; next = pay(s, a.index === 0 ? e.destination === 1 ? { steam: 10 } : { gears: e.destination === 2 ? 15 : 10 } : {}); next = { ...next, expedition: { ...e, choice: a.index } }; break; }
 case 'collect': { const e = s.expedition; if (!e) return s; const d = DESTINATIONS[e.destination]; if (!d) return s; const full = e.choice === 0; next = grant(s, Object.fromEntries(Object.entries(d.reward).map(([k, n]) => [k, full ? n : Math.floor(n / 2)]))); next = { ...next, expedition: null, expeditionCount: s.expeditionCount + 1, blueprints: full ? [...new Set([...s.blueprints, d.blueprint])] : s.blueprints, artifact: s.artifact || (full && d.artifact), notice: `${d.name} returned: ${full ? costText(d.reward) + ' · ' + d.blueprint + ' blueprint' : 'Half cargo recovered; no blueprint'}` }; return withActionFeedback(s, trackContractCompletions(next, true, now), a); }
 case 'engine': next = { ...pay(s, ENGINE_STEPS[s.engineStep]?.cost ?? {}), engineStep: s.engineStep + 1, victory: s.engineStep === ENGINE_STEPS.length - 1 }; break;
 case 'event': { const e = cityEvent(s.eventIndex)?.options[a.index]; if (!e) return s;
 const won = 'risk' in e && a.randomRoll !== undefined && a.randomRoll < e.risk.probability;
 const terms = eventTerms(s, a.index);
 next = grant(pay(s, terms.cost), 'risk' in e ? won ? terms.riskReward : {} : terms.reward);
 if ('character' in e) next = { ...next, traderTransactions: Math.min(Number.MAX_SAFE_INTEGER, s.traderTransactions + 1) };
 if ('penaltySeconds' in e) next = { ...next, shortageSeconds: e.penaltySeconds };
 if (isUnion(s) && a.index === 1 && s.eventPlot !== null) next = { ...next, pendingWalkout: { plot: s.eventPlot, dueAt: s.elapsed + UNION.delay, eventIndex: s.eventIndex } };
 if (isBreakdown(s)) { next = { ...next, plots: a.index === 1 ? s.plots.map((p, i) => i === s.eventPlot ? null : p) : s.plots, damagedPlots: s.damagedPlots.filter(i => i !== s.eventPlot) }; next.resources.steam = Math.min(next.resources.steam, steamCapacity(next)); }
 if ('resolvesEmergency' in e && e.resolvesEmergency) next = { ...next, emergenciesResolved: Math.min(Number.MAX_SAFE_INTEGER, s.emergenciesResolved + 1) };
 next = resolveInteractive(next);
 if ('risk' in e) return withActionFeedback(s, trackContractCompletions({ ...next, notice: won ? `The mechanism works: ${costText(terms.riskReward)} received after paying ${costText(terms.cost)}. Net gain: ${(terms.riskReward.coins ?? 0) - (terms.cost.coins ?? 0)} Brass Coins.` : `The mechanism failed. Your ${costText(terms.cost)} are lost; no reward received.` }, true, now), a);
 break; }
 case 'demo':
 next = { ...freshCity(now), demo: true, unlockedPlots: 12, hasBuiltOilRig: true, resources: { coins: 2500, gears: 700, steam: 180, crystals: 40, research: 300, oil: 200 }, earned: 2500, permits: ['industrial', 'aetherport'], contracts: ['gears', 'steam', 'assembly', 'sky'], technologies: ['boilers', 'automation', 'airships', ...PLOT_TECHNOLOGIES.map(t => t.id)], blueprints: ['hull'], plots: [{ kind: 'workshop', level: 3 }, { kind: 'steamrig', level: 3 }, { kind: 'factory', level: 2 }, { kind: 'laboratory', level: 2 }, { kind: 'dock', level: 1 }, { kind: 'oilrig', level: 2 }, ...Array.from({ length: 6 }, () => null)] };
 next.resources.steam = Math.min(next.resources.steam, steamCapacity(next));
 break;
 case 'reset': return withActionFeedback(s, freshCity(now), a);
 }
 return withActionFeedback(s, trackContractCompletions({ ...next, notice: a.type === 'technology' && a.id === 'ununionizer' ? 'Union prevention is permanent. Unresolved demands and pending walkouts are cancelled; other emergencies are unchanged.' : 'Ledger updated.' }, true, now), a);
}
