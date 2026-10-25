import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityManagement } from '@/components/CityManagement';
import { BUILDINGS, CITY_EVENTS, LEVEL_OUTPUT, type BuildingKind, type Resource } from '@/game/city-config';
import { actionReason, advanceCity, buildingRates, cityAction, freshCity, production, stage, steamCapacity, upgradeCost, type CityAction, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, readCity, writeCity } from '@/game/city-save';
import { useCity } from '@/hooks/useCity';

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
const constructRig = () => cityAction(freshCity(0), { type: 'construct', kind: 'oilrig', plot: 0 }, 0);
const save = (s: CityState) => { expect(writeCity(s, 0)).toBe(true); return decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 0)!; };

describe('Oil-first opening', () => {
 it('has exact starting balances and prices, and protects the only purchase before construction', () => {
  const s = freshCity(0);
  expect(s.resources).toEqual({ coins: 135, gears: 12, steam: 8, oil: 0, crystals: 0, research: 0 });
  expect(Object.values(BUILDINGS).map(b => b.cost.coins)).toEqual([135, 75, 90, 165, 270, 225, 600, 1050, 1200]);
  for (const kind of Object.keys(BUILDINGS) as BuildingKind[]) {
   const action = { type: 'construct', kind, plot: 0 } as const;
   if (kind === 'oilrig') expect(actionReason(s, action)).toBe('');
   else { expect(actionReason(s, action)).toContain('first Oil Rig'); expect(cityAction(s, action).plots).toEqual(s.plots); }
  }
  const shortage = { ...s, eventIndex: 2, eventActive: true };
  expect(actionReason(shortage, { type: 'event', index: 0 })).toContain('Reserve');
  expect(cityAction(shortage, { type: 'event', index: 0 }).resources).toEqual(s.resources);
  expect(cityAction(shortage, { type: 'event', index: 0 }).eventActive).toBe(true);
  const built = constructRig();
  expect(built.resources.coins).toBe(0);
  expect(built.hasBuiltOilRig).toBe(true);
  expect(built.earned).toBe(0);
  expect(cityAction(built, { type: 'construct', kind: 'oilrig', plot: 0 }).resources).toEqual(built.resources);
 });

 it('reaches the workshop at 30 seconds and Steam Rig at 79 including Plot 3 research, without clicking or rewards', () => {
  let s = advanceCity(constructRig(), 29);
  const workshop = { type: 'construct', kind: 'workshop', plot: 1 } as const;
  expect(actionReason(s, workshop)).not.toBe('');
  s = advanceCity(s, 1);
  expect(s.resources.coins).toBe(75);
  s = cityAction(s, workshop);
  s = advanceCity(s, 17);
  expect(s.elapsed).toBe(47);
  s = cityAction(s, { type: 'technology', id: 'plot3' });
  expect(s.unlockedPlots).toBe(3);
  s = advanceCity(s, 31);
  const steamrig = { type: 'construct', kind: 'steamrig', plot: 2 } as const;
  expect(actionReason(s, steamrig)).not.toBe('');
  s = advanceCity(s, 1);
  expect(s.resources.gears).toBeCloseTo(34.05);
  s = cityAction(s, steamrig);
  expect(s.elapsed).toBe(79);
  expect(s.resources.coins).toBeCloseTo(2.2);
  expect(s.resources.gears).toBeCloseTo(26.05);
  expect(steamCapacity(s)).toBe(75);
  const next = advanceCity(s, 10);
  expect(next.resources.oil - s.resources.oil).toBeCloseTo(4);
  expect(next.resources.steam - s.resources.steam).toBeCloseTo(9);
 });

 it('reuses the construction interface and saves the milestone through duplicate clicks, loss and reset', () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  writeCity(freshCity(0), 0);
  function City() { const game = useCity(); return <CityManagement game={game}/>; }
  const ui = render(<StrictMode><City/></StrictMode>);
  const rig = screen.getByRole('article', { name: 'Oil Rig' });
  expect(rig).toHaveClass('city-first-rig');
  expect(rig).toHaveTextContent('YOUR INDUSTRIAL EMPIRE STARTS HERE');
  expect(rig).toHaveTextContent('passive Brass Coin income');
  for (const card of screen.getAllByRole('article')) {
   const button = within(card).getByRole('button', { name: 'Construct' });
   if (card === rig) expect(button).toBeEnabled();
   else expect(button).toBeDisabled();
  }
  fireEvent.click(within(rig).getByRole('button', { name: 'Construct' }));
  expect(screen.queryByText('YOUR INDUSTRIAL EMPIRE STARTS HERE')).not.toBeInTheDocument();
  expect(document.querySelector('.city-first-rig')).not.toBeInTheDocument();
  ui.unmount();
  const hook = renderHook(() => useCity());
  expect(hook.result.current.state.hasBuiltOilRig).toBe(true);
  expect(hook.result.current.state.notice).not.toContain('YOUR INDUSTRIAL EMPIRE STARTS HERE');
  expect(hook.result.current.state.resources.coins).toBe(0);
  act(() => hook.result.current.act({ type: 'demolish', plot: 0 }));
  expect(hook.result.current.state.hasBuiltOilRig).toBe(true);
  expect(save(hook.result.current.state).hasBuiltOilRig).toBe(true);
  act(() => hook.result.current.reset());
  expect(hook.result.current.state.hasBuiltOilRig).toBe(false);
  expect(hook.result.current.state.resources.coins).toBe(135);
 });
});

describe('Production and economical upgrades', () => {
 it('loads a sustainable demo within storage limits and without new-city onboarding', () => {
  const s = cityAction(freshCity(0), { type: 'demo' }, 0);
  expect(s.hasBuiltOilRig).toBe(true);
  expect(s.resources.steam).toBeLessThanOrEqual(steamCapacity(s));
  const next = advanceCity(s, 60);
  expect(next.resources.oil).toBeGreaterThan(s.resources.oil);
  expect(next.resources.coins).toBeGreaterThan(s.resources.coins);
  expect(production(next).effectiveOutput.steam).toBeGreaterThanOrEqual(0);
 });
 it.each(Object.keys(BUILDINGS) as BuildingKind[])('%s has exact level multipliers and fixed inputs', kind => {
  const s = { ...freshCity(0), hasBuiltOilRig: true };
  const b = BUILDINGS[kind];
  for (const level of [1, 2, 3]) {
   const rates = buildingRates(s, { kind, level }, 0);
   for (const key of Object.keys(s.resources) as Resource[]) {
    expect(rates.output[key]).toBeCloseTo((b.output[key] ?? 0) * LEVEL_OUTPUT[level - 1]!);
    expect(rates.input[key]).toBe(b.input[key] ?? 0);
   }
   if (level < 3) {
    const cost = upgradeCost({ kind, level });
    for (const [key, value] of Object.entries(b.cost)) expect(cost[key as Resource]).toBe(Math.ceil(value * (level === 1 ? .15 : .2)));
   }
  }
 });

 it('charges upgrades once per level, caps levels, and previews the same production used by the clock', () => {
  let s = constructRig(); s.resources.coins = 100;
  s = cityAction(s, { type: 'upgrade', plot: 0 });
  expect(s.resources.coins).toBe(79);
  s = cityAction(s, { type: 'upgrade', plot: 0 });
  expect(s.resources.coins).toBe(52);
  const rejected = cityAction(s, { type: 'upgrade', plot: 0 });
  expect(rejected.resources).toEqual(s.resources);
  expect(rejected.notice).toBe('Maximum level reached');
  const next = advanceCity(s, 1);
  expect(next.resources.coins - s.resources.coins).toBeCloseTo(3.5);
  expect(next.resources.oil).toBeCloseTo(1.12);
 });

 it('processes the complete chain independently of plot order, including factory-to-laboratory supply', () => {
  const kinds: BuildingKind[] = ['oilrig', 'steamrig', 'workshop', 'factory', 'bakery', 'laboratory', 'dock', 'refinery'];
  const run = (order: BuildingKind[]) => {
   const s = freshCity(0);
   s.resources = { coins: 0, gears: 0, steam: 0, oil: 0, research: 0, crystals: 0 };
   s.plots = [...order.map(kind => ({ kind, level: 1 })), null, null, null, null];
   s.technologies = ['boilers'];
   return advanceCity(s, 60).resources;
  };
  expect(run(kinds)).toEqual(run([...kinds].reverse()));
  const result = run(kinds);
  expect(result.oil).toBeCloseTo(12);
  expect(result.research).toBeCloseTo(18);
  expect(result.crystals).toBeCloseTo(3);
  expect(result.steam).toBeCloseTo(6);
 });

 it('never overspends scarce inputs or shows starved/capped output as actual production', () => {
  const s = freshCity(0);
  s.resources.oil = .39; s.resources.steam = 0;
  s.plots[0] = { kind: 'steamrig', level: 3 };
  s.plots[1] = { kind: 'steamrig', level: 1 };
  const starved = advanceCity(s, 1);
  expect(starved.resources.oil).toBe(.39);
  expect(starved.resources.steam).toBe(0);
  expect(production(starved).effectiveOutput.steam).toBe(0);
  expect(production(starved).shortages.join(' ')).toContain('paused');
  s.resources.oil = .4;
  const supplied = advanceCity(s, 1);
  expect(supplied.resources.oil).toBe(0);
  expect(supplied.resources.steam).toBeCloseTo(1.26);
  s.plots[1] = null;
  s.resources.steam = steamCapacity(s);
  const full = advanceCity(s, 1);
  expect(production(full).effectiveOutput.steam).toBe(0);
  expect(production(full).effectiveInput.oil).toBeCloseTo(.4);
  for (const value of Object.values(full.resources)) expect(value).toBeGreaterThanOrEqual(0);
 });

 it('keeps research, shortages, damage and shared rate calculations consistent', () => {
  const s = freshCity(0);
  s.plots[0] = { kind: 'steamrig', level: 3 };
  s.plots[1] = { kind: 'factory', level: 2 };
  s.plots[2] = { kind: 'boiler', level: 1 };
  s.technologies = ['boilers', 'automation'];
  s.shortageSeconds = 60;
  s.resources.oil = 10;
  expect(buildingRates(s, s.plots[0]!, 0).output.steam).toBeCloseTo(1.89);
  expect(buildingRates(s, s.plots[1]!, 1).output.gears).toBeCloseTo(1.5 * 1.2 * 1.25 * 1.5 * .5);
  const next = advanceCity(s, 1);
  const rates = production(next);
  for (const key of Object.keys(s.resources) as Resource[]) expect(next.resources[key] - s.resources[key]).toBeCloseTo(rates.effectiveOutput[key] - rates.effectiveInput[key]);
  next.damagedPlots = [0, 1, 2]; next.lastProduction = null;
  expect(production(next).effectiveOutput).toEqual({ coins: 0, gears: 0, steam: 0, crystals: 0, research: 0, oil: 0 });
 });

 it('uses the same supply order offline and online, caps catch-up, and excludes transient rates from saves', () => {
  let online = constructRig();
  online.plots[1] = { kind: 'steamrig', level: 1 };
  const initial = online;
  for (let i = 0; i < 60; i++) online = advanceCity(online, 1);
  const offline = advanceCity(initial, 60);
  for (const key of Object.keys(online.resources) as Resource[]) expect(online.resources[key]).toBeCloseTo(offline.resources[key]);
  expect(advanceCity(initial, 10000).elapsed).toBe(7200);
  expect(save(offline).lastProduction).toBe(null);
  expect(JSON.parse(localStorage.getItem(CITY_SAVE_KEY)!).state).not.toHaveProperty('lastProduction');
  expect(save(freshCity(0)).hasBuiltOilRig).toBe(false);
 });
});

describe('Economy save migration', () => {
 it('preserves old progress without giving starter coins or imposing first-rig locks', () => {
  const s = freshCity(123);
  s.resources.coins = 7;
  s.plots[0] = { kind: 'boiler', level: 3 };
  s.contracts = ['gears', 'steam']; s.permits = ['industrial'];
  s.technologies = ['boilers']; s.blueprints = ['hull']; s.emergenciesResolved = 2;
  s.shortageSeconds = 34; s.expedition = { destination: 0, endsAt: 123000, choice: 0 };
  const { oil, ...resources } = s.resources;
  const old = decodeCity(JSON.stringify({ version: 2, eventCycleLength: 7, state: { ...s, resources } }), 0)!;
  expect(old.resources).toEqual({ ...resources, oil: 0 });
  expect(old.hasBuiltOilRig).toBe(true);
  expect(old.notice).toContain('Progression updated');
  expect(old.technologies).toEqual(expect.arrayContaining(s.technologies));
  for (const key of ['plots', 'contracts', 'permits', 'blueprints', 'emergenciesResolved', 'shortageSeconds', 'expedition'] as const) expect(old[key]).toEqual(s[key]);
  const roundTrip = save(old);
  expect(roundTrip.resources).toEqual(old.resources);
  expect(roundTrip.hasBuiltOilRig).toBe(true);
  expect(roundTrip.notice).not.toContain('Economy updated');
 });

 it('retains new damage/walkout targets and validates oil without replaying feedback', () => {
  let s = constructRig();
  s = { ...s, eventIndex: 5, eventDue: 0 };
  s = advanceCity(s, 0);
  const broken = save(s);
  expect(broken.damagedPlots).toEqual([0]);
  expect(broken.resources).toEqual(s.resources);
  expect(broken.actionFeedback).toBe(null);
  s = cityAction(s, { type: 'event', index: 0 });
  s = advanceCity({ ...s, eventIndex: 6, eventDue: 0 }, 0);
  s = cityAction(s, { type: 'event', index: 1 });
  const pending = save(s);
  expect(pending.pendingWalkout).toEqual(s.pendingWalkout);
  const lost = advanceCity(pending, 5);
  expect(lost.plots[0]).toBe(null);
  expect(lost.hasBuiltOilRig).toBe(true);
  expect(save(lost).pendingWalkout).toBe(null);
  const malformed = decodeCity(JSON.stringify({ version: 2, economyRevision: 1, eventCycleLength: 7, state: { ...freshCity(0), resources: { ...freshCity(0).resources, oil: -10 } } }), 0)!;
  expect(malformed.resources.oil).toBe(0);
  expect(decodeCity(JSON.stringify({ version: 2, economyRevision: 999, state: s }))).toBe(null);
 });

 it('preserves v1 coin migration and exempts imported cities from onboarding', () => {
  localStorage.setItem('brasshaven-save-v1', JSON.stringify({ coins: 50, lifetimeCoins: 100, owned: { workshop: 1 } }));
  const s = readCity();
  expect(s.resources.coins).toBe(50);
  expect(s.resources.oil).toBe(0);
  expect(s.hasBuiltOilRig).toBe(true);
  expect(s.plots[0]?.kind).toBe('workshop');
 });
});

describe('Full production-chain progression', () => {
 it.each([false, true])('reaches victory without crank/demo/lucky trades (resolving emergencies: %s)', resolveEvents => {
  let s = freshCity(0);
  if (!resolveEvents) s.eventDue = 1e9;
  const resolved = new Set<number>();
  function tick() {
   s = advanceCity(s, 1, .99);
   if (resolveEvents && s.eventActive) {
    const index = s.eventIndex % CITY_EVENTS.length;
    const choice = index === 0 ? 1 : index === 1 ? 1 : index === 2 ? 1 : index === 3 ? 1 : index === 4 ? 1 : 0;
    const action = { type: 'event', index: choice, eventIndex: s.eventIndex } as const;
    if (!actionReason(s, action) && (index !== 1 || s.resources.gears >= 37)) {
     s = cityAction(s, action, s.elapsed * 1000);
     resolved.add(index);
    }
   }
   for (const value of Object.values(s.resources)) expect(value).toBeGreaterThanOrEqual(0);
  }
  function perform(a: CityAction) {
   for (let i = 0; i < 7200; i++) {
    if (!actionReason(s, a, s.elapsed * 1000)) {
     const next = cityAction(s, a, s.elapsed * 1000);
     // Keep a repair reserve when actively cycling emergencies.
     if (!resolveEvents || next.resources.gears >= 7) { s = next; return; }
    }
    tick();
   }
   throw new Error(`Unreachable action ${JSON.stringify(a)} at ${s.elapsed}s: ${actionReason(s, a, s.elapsed * 1000)}`);
  }
  perform({ type: 'construct', kind: 'oilrig', plot: 0 });
  perform({ type: 'construct', kind: 'workshop', plot: 1 });
  perform({ type: 'technology', id: 'plot3' });
  perform({ type: 'construct', kind: 'steamrig', plot: 2 });
  perform({ type: 'contract', id: 'gears' });
  perform({ type: 'contract', id: 'steam' });
  expect(stage(s)).toBe(1);
  perform({ type: 'technology', id: 'plot4' });
  perform({ type: 'construct', kind: 'laboratory', plot: 3 });
  perform({ type: 'technology', id: 'plot5' });
  perform({ type: 'construct', kind: 'bakery', plot: 4 });
  perform({ type: 'technology', id: 'plot6' });
  perform({ type: 'construct', kind: 'factory', plot: 5 });
  perform({ type: 'technology', id: 'boilers' });
  perform({ type: 'technology', id: 'automation' });
  perform({ type: 'contract', id: 'assembly' });
  perform({ type: 'technology', id: 'airships' });
  perform({ type: 'contract', id: 'sky' });
  perform({ type: 'technology', id: 'plot7' });
  perform({ type: 'construct', kind: 'oilrig', plot: 6 });
  perform({ type: 'technology', id: 'plot8' });
  perform({ type: 'construct', kind: 'laboratory', plot: 7 });
  perform({ type: 'technology', id: 'plot9' });
  perform({ type: 'construct', kind: 'dock', plot: 8 });
  perform({ type: 'upgrade', plot: 2 });
  perform({ type: 'contract', id: 'engine' });
  perform({ type: 'technology', id: 'plot10' });
  perform({ type: 'construct', kind: 'refinery', plot: 9 });
  for (const index of [0, 2]) {
   perform({ type: 'launch', index });
   perform({ type: 'expeditionChoice', index: 0 });
   perform({ type: 'collect' });
  }
  perform({ type: 'engine' }); perform({ type: 'engine' });
  perform({ type: 'upgrade', plot: 2 }); perform({ type: 'engine' });
  expect(s.victory).toBe(true);
  expect(s.demo).toBe(false);
  expect(s.artifact).toBe(true);
  expect(s.blueprints).toEqual(expect.arrayContaining(['hull', 'lens', 'engine']));
  expect(s.elapsed).toBeLessThan(3600);
  if (resolveEvents) {
   expect([...resolved].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
   expect(s.emergenciesResolved).toBeGreaterThanOrEqual(2);
   perform({ type: 'contract', id: 'maintenance' });
   expect(s.contracts).toContain('maintenance');
  }
  for (const id of ['reservoir', 'fineprint', 'bargain', 'whirr', 'plot11', 'plot12', 'ununionizer']) perform({ type: 'technology', id });
  expect(s.unlockedPlots).toBe(12);
  expect(s.pendingWalkout).toBe(null);
  for (const id of ['crude', 'gearmeup', 'steamy', 'gap', 'tourist', 'aether', 'questionable']) perform({ type: 'contract', id });
  if (resolveEvents) perform({ type: 'contract', id: 'teacup' });
  expect(s.elapsed).toBeLessThan(7200);
 });
});
