import { BALANCE, BUILDINGS, CITY_EVENTS, CONTRACTS, PLOT_TECHNOLOGIES, SHORTAGE_PENALTY, TECHNOLOGIES, type Resource } from './city-config';
import { eventState, freshCity, isBreakdown, isUnion, preventUnion, reconcileContent, stage, steamCapacity, trackContractCompletions, type CityState, type Plot } from './city';
export const CITY_SAVE_KEY = 'brasshaven-save-v2';
export function decodeCity(raw: string, now = Date.now()): CityState | null {
 try { const p = JSON.parse(raw); if (p.version !== 2 || !p.state || typeof p.state !== 'object' || (p.economyRevision !== undefined && p.economyRevision !== 1) || (p.progressionRevision !== undefined && p.progressionRevision !== 1)) return null; const v = p.state; const base = freshCity(now); const finite = (n: unknown, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : fallback;
 const strings = (a: unknown) => Array.isArray(a) ? [...new Set(a.filter((x): x is string => typeof x === 'string'))] : [];
 const plots: (Plot | null)[] = base.plots.map((_, i) => { const b = v.plots?.[i]; return b && Object.hasOwn(BUILDINGS, b.kind) ? { kind: b.kind, level: Math.min(BALANCE.maxLevel, Math.max(1, Math.floor(finite(b.level, 1)))) } : null; });
 const expedition = v.expedition && Number.isInteger(v.expedition.destination) && v.expedition.destination >= 0 && v.expedition.destination < 3 && Number.isFinite(v.expedition.endsAt) ? { destination: v.expedition.destination, endsAt: v.expedition.endsAt, choice: [0, 1].includes(v.expedition.choice) ? v.expedition.choice : null } : null;
 const engineStep = Math.min(3, Math.floor(finite(v.engineStep)));
 const s: CityState = { ...base, resources: { ...base.resources }, earned: finite(v.earned), plots, contracts: strings(v.contracts), permits: strings(v.permits), technologies: strings(v.technologies), blueprints: strings(v.blueprints), artifact: v.artifact === true, expedition, expeditionCount: Math.floor(finite(v.expeditionCount)), engineStep, victory: engineStep === 3, eventIndex: Math.floor(finite(v.eventIndex)), eventDue: finite(v.eventDue, BALANCE.eventInterval), eventActive: v.eventActive === true, elapsed: finite(v.elapsed), lastSaved: finite(v.lastSaved, now), demo: v.demo === true };
 const occupiedLimit = plots.reduce((n, b, i) => b ? Math.max(n, i + 1) : n, 2);
 const researchedLimit = PLOT_TECHNOLOGIES.reduce((n, t) => s.technologies.includes(t.id) ? Math.max(n, t.unlockPlot) : n, 2);
 s.unlockedPlots = Math.min(12, Math.max(2, occupiedLimit, researchedLimit, p.progressionRevision === undefined ? [4, 8, 12][stage(s)] ?? 4 : Math.floor(finite(v.unlockedPlots, 2))));
 s.technologies = [...new Set([...s.technologies, ...PLOT_TECHNOLOGIES.filter(t => t.unlockPlot <= s.unlockedPlots).map(t => t.id)])];
 s.completedContracts = strings(v.completedContracts).filter(id => CONTRACTS.some(c => c.id === id));
 s.firstResearch = typeof v.firstResearch === 'boolean' ? v.firstResearch : strings(v.technologies).some(id => TECHNOLOGIES.some(t => t.id === id));
 s.peakCoins = finite(v.peakCoins);
 s.traderTransactions = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(finite(v.traderTransactions)));
 s.hasBuiltOilRig = p.economyRevision === undefined || v.hasBuiltOilRig === true || plots.some(b => b?.kind === 'oilrig');
 if (s.hasBuiltOilRig) s.notice = 'Your city ledger has been restored.';
 if (p.economyRevision === undefined) s.notice = 'Economy updated: oil production, building prices and level output have changed. Existing buildings and progress are retained; demolition refunds use current base prices.';
 if (p.progressionRevision === undefined) s.notice = `Progression updated: your ${s.unlockedPlots} unlocked plots and existing research are retained. Future land unlocks are researched individually. Expeditions now cost more and carry five times the ordinary cargo.`;
 s.shortageSeconds = Math.min(SHORTAGE_PENALTY.seconds, finite(v.shortageSeconds));
 s.emergenciesResolved = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(finite(v.emergenciesResolved)));
 // Older saves used six events. Preserve the pending event and merchant visit on migration.
 if (p.eventCycleLength === undefined || p.eventCycleLength === 6) s.eventIndex = Math.floor(s.eventIndex / 6) * CITY_EVENTS.length + s.eventIndex % 6;
 else if (p.eventCycleLength !== CITY_EVENTS.length) return null;
 const validPlot = (i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < plots.length && Boolean(plots[i]);
 // Previously completed walkouts used staffing flags; migrate them to property loss without refunds.
 const lostPlots: number[] = Array.isArray(v.unstaffedPlots) ? v.unstaffedPlots.filter(validPlot) : [];
 for (const i of lostPlots) plots[i] = null;
 if (lostPlots.length) s.notice = 'Properties from earlier worker walkouts were lost without refunds. Their plots are available for rebuilding.';
 if (s.eventActive && isBreakdown(s)) {
 const validPlot = (i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < plots.length && Boolean(plots[i]);
 const damaged: number[] = Array.isArray(v.damagedPlots) ? v.damagedPlots.filter(validPlot) : [];
 s.eventPlot = validPlot(v.eventPlot) ? v.eventPlot : damaged[0] ?? null;
 s.damagedPlots = s.eventPlot === null ? [] : [s.eventPlot];
 if (s.eventPlot !== null) { const p = plots[s.eventPlot]; if (p) s.notice = `${BUILDINGS[p.kind].name} on plot ${s.eventPlot + 1} has broken down. Production is paused.`; }
 }
 if (s.eventActive && isUnion(s) && validPlot(v.eventPlot)) s.eventPlot = v.eventPlot;
 const legacyEvents = v.secondEvent === undefined ? v.eventQueue ?? [] : v.secondEvent === null ? [] : [v.secondEvent];
 if (!Array.isArray(legacyEvents) || (!s.eventActive && legacyEvents.length)) return null;
 {
  let lastIndex = s.eventIndex; const targets = new Set(s.eventPlot === null ? [] : [s.eventPlot]);
  for (const [index, e] of legacyEvents.entries()) {
   if (!e || !Number.isSafeInteger(e.eventIndex) || e.eventIndex <= lastIndex) return null;
   const targeted = isBreakdown({ ...s, eventIndex:e.eventIndex }) || isUnion({ ...s, eventIndex:e.eventIndex });
   if (targeted ? !validPlot(e.eventPlot) || targets.has(e.eventPlot) : e.eventPlot !== null) return null;
   lastIndex = e.eventIndex; if (e.eventPlot !== null) targets.add(e.eventPlot);
   if (index === 0) {
    s.secondEvent = { eventIndex: e.eventIndex, eventPlot: e.eventPlot };
    if (isBreakdown(eventState(s,e))) s.damagedPlots.push(e.eventPlot);
   }
  }
  if (legacyEvents.length > 1) s.notice = 'Alert system updated: both visible alerts are retained. Unseen legacy alerts were cancelled without costs or rewards; their machine damage was cleared.';
 }
 if (v.eventCursor !== undefined && v.eventCursor !== null) {
  if (!Number.isSafeInteger(v.eventCursor) || v.eventCursor <= Math.max(s.eventIndex,...legacyEvents.map(e=>e.eventIndex)) || (v.nextEventDue !== null && (!Number.isFinite(v.nextEventDue) || v.nextEventDue < 0))) return null;
  s.eventCursor = v.eventCursor; s.nextEventDue = s.secondEvent ? null : finite(v.nextEventDue, s.elapsed + BALANCE.eventInterval);
 }
 if (s.secondEvent && s.eventCursor === null) s.eventCursor = s.secondEvent.eventIndex + 1;
 const researchIds = TECHNOLOGIES.map(t=>t.id) as readonly string[]; const contractIds = CONTRACTS.map(c=>c.id) as readonly string[];
 s.knownResearch = strings(v.knownResearch).filter(id=>researchIds.includes(id)); s.knownContracts = strings(v.knownContracts).filter(id=>contractIds.includes(id));
 s.viewedResearch = strings(v.viewedResearch).filter(id=>researchIds.includes(id)); s.viewedContracts = strings(v.viewedContracts).filter(id=>contractIds.includes(id));
 s.unlockNoticeId = Math.floor(finite(v.unlockNoticeId));
 if (v.unlockNotices !== undefined) {
  if (!Array.isArray(v.unlockNotices)) return null;
  let last = 0;
  for (const n of v.unlockNotices) {
   if (!n || !Number.isSafeInteger(n.id) || n.id <= last || n.id > s.unlockNoticeId || !['NEW CONTRACTS UNLOCKED!','NEW RESEARCH UNLOCKED!','NEW RESEARCH AND CONTRACTS UNLOCKED!'].includes(n.message) || typeof n.detail !== 'string') return null;
   last = n.id;
   const previous = s.unlockNotices[0];
   s.unlockNotices = [{id:n.id,message:previous && previous.message !== n.message ? 'NEW RESEARCH AND CONTRACTS UNLOCKED!' : n.message,detail:previous ? `${previous.detail} · ${n.detail}` : n.detail}];
  }
 }
 const pending = v.pendingWalkout;
 if (pending != null) {
 if (!validPlot(pending.plot) || s.damagedPlots.includes(pending.plot) || typeof pending.dueAt !== 'number' || !Number.isFinite(pending.dueAt) || pending.dueAt < 0 || !Number.isSafeInteger(pending.eventIndex) || pending.eventIndex < 0 || !isUnion({ ...s, eventIndex: pending.eventIndex }) || pending.eventIndex >= (s.eventCursor ?? s.eventIndex)) return null;
 s.pendingWalkout = { plot: pending.plot, dueAt: pending.dueAt, eventIndex: pending.eventIndex };
 }
 for (const k of Object.keys(s.resources) as Resource[]) s.resources[k] = finite(v.resources?.[k], base.resources[k]); s.resources.steam = Math.min(s.resources.steam, steamCapacity(s)); return reconcileContent(trackContractCompletions(preventUnion(s), false), false);
 } catch { return null; }
}
export function readCity(): CityState { const now = Date.now(); try { const raw = localStorage.getItem(CITY_SAVE_KEY); if (raw) { const decoded = decodeCity(raw, now); if (decoded) return decoded; }
 const legacy = localStorage.getItem('brasshaven-save-v1'); if (legacy) {
 const p = JSON.parse(legacy); const base = freshCity(now);
 const coins = typeof p.coins === 'number' && Number.isFinite(p.coins) ? Math.max(25, p.coins) : 25;
 const owned = p.owned ?? {}; const kinds = ['workshop', 'bakery', 'factory', 'dock'] as const;
 let i = 0; for (const kind of kinds) if ((owned[kind === 'dock' ? 'airship' : kind] ?? 0) > 0) base.plots[i++] = { kind, level: 1 };
 const districts: unknown[] = Array.isArray(p.unlockedDistricts) ? p.unlockedDistricts : [];
 base.unlockedPlots = districts.includes('aetherport') ? 12 : districts.includes('industrial') ? 8 : 4;
 base.technologies = PLOT_TECHNOLOGIES.filter(t => t.unlockPlot <= base.unlockedPlots).map(t => t.id);
 base.hasBuiltOilRig = true; base.resources.coins = coins; base.earned = Math.max(0, Number(p.lifetimeCoins) || 0);
 base.notice = 'Your old coin balance and businesses were carried into the new city. Districts now require permits. Oil production and revised building prices are now available.';
 return reconcileContent(trackContractCompletions(base, false), false); }
 } catch { /* Invalid saves start safely. */ } return freshCity(now); }
type PersistentCityState = Pick<CityState,
 'resources' | 'earned' | 'plots' | 'damagedPlots' | 'unlockedPlots' |
 'contracts' | 'completedContracts' | 'firstResearch' | 'peakCoins' |
 'permits' | 'technologies' | 'blueprints' | 'artifact' |
 'expedition' | 'expeditionCount' | 'engineStep' |
 'eventIndex' | 'eventDue' | 'eventActive' | 'eventPlot' |
 'secondEvent' | 'eventCursor' | 'nextEventDue' | 'pendingWalkout' |
 'shortageSeconds' | 'emergenciesResolved' | 'traderTransactions' |
 'hasBuiltOilRig' | 'knownResearch' | 'knownContracts' |
 'viewedResearch' | 'viewedContracts' | 'elapsed' | 'lastSaved' | 'demo'
>;

export function writeCity(s: CityState, now = Date.now()) {
 try {
  const saved: PersistentCityState = {
   resources: {
    coins: s.resources.coins,
    gears: s.resources.gears,
    steam: s.resources.steam,
    crystals: s.resources.crystals,
    research: s.resources.research,
    oil: s.resources.oil,
   },
   earned: s.earned,
   plots: s.plots.map(plot => plot ? { kind: plot.kind, level: plot.level } : null),
   damagedPlots: s.damagedPlots,
   unlockedPlots: s.unlockedPlots,
   contracts: s.contracts,
   completedContracts: s.completedContracts,
   firstResearch: s.firstResearch,
   peakCoins: s.peakCoins,
   permits: s.permits,
   technologies: s.technologies,
   blueprints: s.blueprints,
   artifact: s.artifact,
   expedition: s.expedition ? {
    destination: s.expedition.destination,
    endsAt: s.expedition.endsAt,
    choice: s.expedition.choice,
   } : null,
   expeditionCount: s.expeditionCount,
   engineStep: s.engineStep,
   eventIndex: s.eventIndex,
   eventDue: s.eventDue,
   eventActive: s.eventActive,
   eventPlot: s.eventPlot,
   secondEvent: s.secondEvent ? {
    eventIndex: s.secondEvent.eventIndex,
    eventPlot: s.secondEvent.eventPlot,
   } : null,
   eventCursor: s.eventCursor,
   nextEventDue: s.nextEventDue,
   pendingWalkout: s.pendingWalkout ? {
    plot: s.pendingWalkout.plot,
    dueAt: s.pendingWalkout.dueAt,
    eventIndex: s.pendingWalkout.eventIndex,
   } : null,
   shortageSeconds: s.shortageSeconds,
   emergenciesResolved: s.emergenciesResolved,
   traderTransactions: s.traderTransactions,
   hasBuiltOilRig: s.hasBuiltOilRig,
   knownResearch: s.knownResearch,
   knownContracts: s.knownContracts,
   viewedResearch: s.viewedResearch,
   viewedContracts: s.viewedContracts,
   elapsed: s.elapsed,
   lastSaved: now,
   demo: s.demo,
  };
  localStorage.setItem(CITY_SAVE_KEY, JSON.stringify({ version: 2, economyRevision: 1, progressionRevision: 1, eventCycleLength: CITY_EVENTS.length, state: saved }));
  return true;
 } catch { return false; }
}
