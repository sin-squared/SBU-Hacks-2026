import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPopup } from '@/components/ActionPopup';
import { CityManagement } from '@/components/CityManagement';
import { CityEvent, Contracts, Research } from '@/components/CityPanels';
import { BALANCE, BUILDINGS, cityEvent, CONTRACTS, DESTINATIONS, ENGINE_STEPS, TECHNOLOGIES } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, freshCity, type CityAction, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity } from '@/hooks/useCity';

function funded(): CityState {
 const s = freshCity(100000);
 return { ...s, hasBuiltOilRig: true, earned: 10000, permits: ['industrial', 'aetherport'], resources: { coins: 10000, gears: 10000, steam: 30, crystals: 10000, research: 10000, oil: 10000 } };
}
function expectMessage(before: CityState, action: CityAction, message: string, now = 100000) {
 expect(actionReason(before, action, now)).toBe('');
 const next = cityAction(before, action, now);
 expect(next.actionFeedback).toMatchObject({ id: (before.actionFeedback?.id ?? 0) + 1, message });
 return next;
}
function expectRejected(before: CityState, action: CityAction, now = 100000) {
 const reason = actionReason(before, action, now);
 expect(reason).not.toBe('');
 const next = cityAction(before, action, now);
 expect(next).toEqual({ ...before, notice: reason });
 return next;
}
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('Successful gameplay popup mapping', () => {
 it.each([
  ['workshop', 'WORKSHOP BUILT!'], ['boiler', 'BOILER ONLINE!'], ['bakery', 'BAKERY OPEN!'],
  ['factory', 'FACTORY ONLINE!'], ['laboratory', 'LAB ONLINE!'], ['dock', 'DOCK ESTABLISHED!'],
  ['oilrig', 'OIL RIG ONLINE!'], ['steamrig', 'STEAM RIG ONLINE!'], ['refinery', 'REFINERY ONLINE!'],
 ] as const)('constructs %s with the correct feedback and no duplicate purchase', (kind, message) => {
  const s = funded();
  s.resources.steam = 100;
  const action = { type: 'construct', plot: 0, kind } as const;
  const next = expectMessage(s, action, message);
  expect(next.plots[0]).toEqual({ kind, level: 1 });
  expect(next.resources.coins).toBe(s.resources.coins - (BUILDINGS[kind].cost.coins ?? 0));
  expectRejected(next, action);
 });

 it('upgrades and demolishes with actual level/refund changes', () => {
  const s = funded();
  s.plots[0] = { kind: 'workshop', level: 1 };
  const upgraded = expectMessage(s, { type: 'upgrade', plot: 0 }, 'UPGRADE COMPLETE!');
  expect(upgraded.plots[0]?.level).toBe(2);
  expect(upgraded.resources.coins).toBe(s.resources.coins - 12);
  const demolished = expectMessage(upgraded, { type: 'demolish', plot: 0 }, 'BUILDING DISMANTLED!');
  expect(demolished.plots[0]).toBe(null);
  expect(demolished.resources.coins).toBe(upgraded.resources.coins + 37);
  expectRejected(demolished, { type: 'demolish', plot: 0 });
 });

 it.each(['gears', 'steam', 'assembly', 'sky', 'engine'] as const)('claims contract %s only once without a claim popup', id => {
  const s = funded();
  s.resources.steam = 100;
  s.contracts = id === 'gears' ? [] : ['gears'];
  s.technologies = ['airships'];
  s.blueprints = ['hull'];
  const contract = CONTRACTS.find(c => c.id === id)!;
  const next = cityAction(s, { type: 'contract', id });
  expect(next.actionFeedback).toBe(s.actionFeedback);
  expect(next.contracts).toContain(id);
  expect(next.resources.coins).toBe(s.resources.coins - ('coins' in contract.cost ? contract.cost.coins : 0) + contract.reward.coins);
  if (contract.permit) expect(next.permits).toContain(contract.permit);
  expectRejected(next, { type: 'contract', id });
 });

 it.each([
  ['boilers', 'RESEARCH COMPLETE!'], ['automation', 'RESEARCH COMPLETE!'], ['airships', 'RESEARCH COMPLETE!'],
 ] as const)('purchases technology %s only once', (id, message) => {
  const s = funded();
  const technology = TECHNOLOGIES.find(t => t.id === id)!;
  s.technologies = technology.requires ? [technology.requires] : [];
  const next = expectMessage(s, { type: 'technology', id }, message);
  expect(next.technologies).toContain(id);
  expect(next.resources.research).toBe(s.resources.research - ('research' in technology.cost ? technology.cost.research : 0));
  expectRejected(next, { type: 'technology', id });
 });

 const voyages = [
  { index: 0, launch: 'OBSERVATORY BOUND!', encounter: ['STAR CHAMBER OPENED!', 'INSTRUMENTS SALVAGED!'], collect: ['LENS BLUEPRINT SECURED!', 'INSTRUMENTS RECOVERED!'] },
  { index: 1, launch: 'IRONWOOD BOUND!', encounter: ['BRIDGE CROSSED!', 'SAFE SALVAGE!'], collect: ['HULL BLUEPRINT SECURED!', 'CARGO SALVAGED!'] },
  { index: 2, launch: 'FOUNDRY BOUND!', encounter: ['CORE VAULT BREACHED!', 'OUTER SALVAGE!'], collect: ['ANCIENT CORE RECOVERED!', 'FOUNDRY SALVAGED!'] },
 ] as const;
 it.each(voyages)('maps destination $index launch and both actual encounter/cargo outcomes', voyage => {
  for (const choice of [0, 1] as const) {
   const s = funded();
   s.resources.steam = 100;
   s.plots[0] = { kind: 'dock', level: 1 };
   const d = DESTINATIONS[voyage.index]!;
   const launched = expectMessage(s, { type: 'launch', index: voyage.index }, voyage.launch, 0);
   expect(launched.expedition?.destination).toBe(voyage.index);
   expect(launched.blueprints).toEqual([]);
   expect(launched.artifact).toBe(false);
   expectRejected(launched, { type: 'launch', index: voyage.index }, 0);
   expectRejected(launched, { type: 'expeditionChoice', index: choice }, 0);
   const decided = expectMessage(launched, { type: 'expeditionChoice', index: choice }, voyage.encounter[choice], d.duration * 500);
   expect(decided.expedition?.choice).toBe(choice);
   expect(decided.blueprints).toEqual([]);
   expect(decided.artifact).toBe(false);
   expectRejected(decided, { type: 'expeditionChoice', index: choice }, d.duration * 500);
   expectRejected(decided, { type: 'collect' }, d.duration * 500);
   const collected = expectMessage(decided, { type: 'collect' }, voyage.collect[choice], d.duration * 1000);
   expect(collected.expedition).toBe(null);
   expect(collected.expeditionCount).toBe(1);
   expect(collected.blueprints).toEqual(choice === 0 ? [d.blueprint] : []);
   expect(collected.artifact).toBe(choice === 0 && d.artifact);
   expect(collected.notice).toContain(choice === 0 ? d.blueprint : 'Half cargo recovered; no blueprint');
   for (const [resource, reward] of Object.entries(d.reward)) {
    if (resource === 'steam') continue;
    const key = resource as keyof typeof collected.resources;
    expect(collected.resources[key]).toBe(decided.resources[key] + (choice === 0 ? reward : Math.floor(reward / 2)));
   }
   expectRejected(collected, { type: 'collect' }, d.duration * 1000);
  }
 });

 it('maps all three engine stages and accompanies actual victory', () => {
  let s = funded();
  s.resources.steam = 100;
  s.blueprints = ['hull', 'lens', 'engine'];
  s.artifact = true;
  const messages = ['CHASSIS REBUILT!', 'LENS CALIBRATED!', 'ENGINE IGNITED!'];
  ENGINE_STEPS.forEach((step, i) => {
   const coins = s.resources.coins;
   s = expectMessage(s, { type: 'engine' }, messages[i]!);
   expect(s.engineStep).toBe(i + 1);
   expect(s.victory).toBe(i === 2);
   expect(s.resources.coins).toBe(coins - ('coins' in step.cost ? step.cost.coins : 0));
  });
  expectRejected(s, { type: 'engine' });
 });

 it.each([
  ['BOILER REPAIRED!', 'PRESSURE RELEASED!'],
  ['CRYSTALS ACQUIRED!', 'GEARS TRADED!', 'SUPPLIES SECURED!'],
  ['SUPPLIES SECURED!', 'TEMPORARY FIX!', 'PROBLEMS MAY WORSEN...'],
  ['KNOWLEDGE GAINED!', 'SCRAP SOLD!'],
  ['OVERTIME PAID!', 'STEADY SHIFT!'],
  ['MACHINE RESTORED!', 'BUILDING SCRAPPED!'],
  ['WORKERS PAID!', 'WAGES WITHHELD!'],
 ].map((messages, index) => ({ messages, index })))('maps every choice of city event $index without duplicate rewards', ({ messages, index }) => {
  expect(messages).toHaveLength(cityEvent(index)!.options.length);
  messages.forEach((message, choice) => {
   const s = funded();
   s.eventIndex = index;
   s.eventActive = true;
   if (index === 5) {
    s.plots[0] = { kind: 'workshop', level: 1 };
    s.eventPlot = 0;
    s.damagedPlots = [0];
   }
   if (index === 6) {
    s.plots[0] = { kind: 'workshop', level: 1 };
    s.eventPlot = 0;
   }
   const action = { type: 'event', index: choice, eventIndex: index } as const;
   const next = index === 5 && choice === 0 ? cityAction(s, action) : expectMessage(s, action, message);
   if (index === 5 && choice === 0) expect(next.actionFeedback).toBe(s.actionFeedback);
   expect(next.eventActive).toBe(false);
   expect(next.eventIndex).toBe(index + 1);
   expect(next.shortageSeconds).toBe(index === 2 && choice === 2 ? 60 : 0);
   expectRejected(next, action);
   const later = advanceCity(next, BALANCE.eventInterval);
   expectRejected(later, action);
  });
 });

 it('handles construction, confirmed demo, and reset without reusing feedback IDs', () => {
  const built = expectMessage(funded(), { type: 'construct', kind: 'workshop', plot: 0 }, 'WORKSHOP BUILT!');
  expect(built.resources.coins).toBe(9925);
  const demo = expectMessage(built, { type: 'demo' }, 'DEMO LOADED!');
  expect(demo.demo).toBe(true);
  expect(demo.resources.coins).toBe(2500);
  const reset = expectMessage(demo, { type: 'reset' }, 'CITY RESET!');
  expect(reset).toEqual({ ...freshCity(100000), actionFeedback: { id: 3, message: 'CITY RESET!' } });
  const repeated = expectMessage(reset, { type: 'construct', kind: 'oilrig', plot: 0 }, 'OIL RIG ONLINE!');
  expect(repeated.actionFeedback?.id).toBe(4);
 });
});

describe('Shared popup state and failure integrity', () => {
 it('keeps detailed failure notices and never replaces feedback on rejected actions', () => {
  const s = cityAction(freshCity(100000), { type: 'construct', kind: 'oilrig', plot: 0 });
  s.resources.coins = 0;
  const rejected: CityAction[] = [
   { type: 'construct', kind: 'workshop', plot: 0 },
   { type: 'construct', kind: 'factory', plot: 0 },
   { type: 'upgrade', plot: 0 },
   { type: 'launch', index: 0 },
   { type: 'technology', id: 'automation' },
   { type: 'collect' }, { type: 'engine' }, { type: 'event', index: 0 },
  ];
  for (const action of rejected) expectRejected(s, action);
 });

 it('persists gameplay but never replays feedback after reload or ticks', () => {
  const s = cityAction(freshCity(100000), { type: 'construct', plot: 0, kind: 'oilrig' }, 100000);
  expect(writeCity(s)).toBe(true);
  const raw = localStorage.getItem(CITY_SAVE_KEY)!;
  expect(JSON.parse(raw).state).not.toHaveProperty('actionFeedback');
  const restored = decodeCity(raw)!;
  expect(restored.actionFeedback).toBe(null);
  expect(restored.plots).toEqual(s.plots);
  expect(advanceCity(s, 1).actionFeedback).toBe(s.actionFeedback);
  expect(advanceCity(restored, 100).actionFeedback).toBe(null);
 });

 it('processes queued actions once and replaces popups across components, including StrictMode and reset', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(funded());
  function City() {
   const game = useCity();
   return <><ActionPopup feedback={game.state.actionFeedback} combo={game.state.contractCombo}/><CityManagement game={game}/><Contracts game={game}/><Research game={game}/><CityEvent game={game}/>
    <button onClick={() => {
     game.act({ type: 'contract', id: 'gears' });
     game.act({ type: 'contract', id: 'gears' });
    }}>Queued contract</button>
    <button onClick={game.reset}>Confirm reset</button>
   </>;
  }
  const ui = render(<StrictMode><City/></StrictMode>);
  expect(screen.queryByText('CONTRACT COMPLETE!')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Queued contract' }));
  const first = screen.getByText('CONTRACT COMPLETE!',{exact:false}).closest('[role="status"]')!;
  expect(first).toHaveTextContent('CONTRACT COMPLETE! 3x');
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBe(10100);
  act(() => vi.advanceTimersByTime(3100));
  expect(first).toHaveAttribute('data-phase','fading');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));
  expect(screen.queryByText('CONTRACT COMPLETE!')).not.toBeInTheDocument();
  const resetPopup = screen.getByText('CITY RESET!').closest('[role="status"]')!;
  act(() => vi.advanceTimersByTime(400));
  expect(resetPopup).toHaveAttribute('data-phase', 'visible');
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBe(135);
  fireEvent.click(screen.getByRole('button', { name: 'Plot 2: empty' }));
  expect(resetPopup).toHaveAttribute('data-phase', 'visible');
  expect(document.querySelectorAll('.action-popup')).toHaveLength(1);
  act(() => vi.advanceTimersByTime(1350));
  expect(screen.queryByText('CITY RESET!')).not.toBeInTheDocument();
  ui.unmount();
  act(() => vi.runOnlyPendingTimers());
  expect(vi.getTimerCount()).toBe(0);
 });

 it('uses reset through the same hook action path and saves only the committed result', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(funded());
  const hook = renderHook(() => useCity());
  act(() => hook.result.current.act({ type: 'demo' }));
  expect(hook.result.current.state.actionFeedback?.message).toBe('DEMO LOADED!');
  act(() => hook.result.current.reset());
  expect(hook.result.current.state.actionFeedback).toEqual({ id: 2, message: 'CITY RESET!' });
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBe(135);
 });
});
