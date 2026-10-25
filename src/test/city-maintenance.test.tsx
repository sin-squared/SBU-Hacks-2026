import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPopup } from '@/components/ActionPopup';
import { CityEvent, Contracts } from '@/components/CityPanels';
import { BALANCE, CITY_EVENTS, CONTRACTS } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, contractStatus, freshCity, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity, type CityGame } from '@/hooks/useCity';

const maintenance = CONTRACTS.find(c => c.id === 'maintenance')!;
const claim = { type: 'contract', id: 'maintenance' } as const;
function emergency(eventIndex = 0): CityState {
 const s = freshCity(100000);
 return { ...s, hasBuiltOilRig: true, eventIndex, eventActive: true, resources: { ...s.resources, coins: 100, gears: 50, steam: 20 } };
}
function resolve(s: CityState, index = 1) {
 return cityAction(s, { type: 'event', index, eventIndex: s.eventIndex }, 100000);
}
function card() {
 return screen.getByRole('heading', { name: 'City Maintenance Initiative' }).closest('article')!;
}
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('Maintenance emergency tracking', () => {
 it('preserves the original five and maintenance contracts before new commissions', () => {
  expect(CONTRACTS.slice(0, 6).map(c => c.id)).toEqual(['gears', 'steam', 'assembly', 'sky', 'engine', 'maintenance']);
  expect(CONTRACTS.filter(c => c.id === 'maintenance')).toHaveLength(1);
  expect(maintenance.description).toBe('Successfully resolve two city emergencies.');
  expect(maintenance.reward).toEqual({ coins: 100, research: 20 });
  expect(maintenance.cost).toEqual({});
  expect(maintenance.stage).toBe(1);
 });

 it.each([
  [0, 0, 1], [0, 1, 1],
  [1, 0, 0], [1, 1, 0],
  [2, 0, 1], [2, 1, 1], [2, 2, 0],
  [3, 0, 0], [3, 1, 0],
  [4, 0, 0], [4, 1, 0],
  [5, 0, 1], [5, 1, 1],
  [6, 0, 1], [6, 1, 0],
 ])('event %i choice %i increments progress by %i only after success', (eventIndex, choice, expected) => {
  const s = emergency(eventIndex);
  if (eventIndex === 1 && choice === 0) s.resources.coins = 600;
  if (eventIndex === 5) {
   s.plots[0] = { kind: 'workshop', level: 1 };
   s.eventPlot = 0;
   s.damagedPlots = [0];
  }
  if (eventIndex === 6) {
   s.resources.coins = 200;
   s.plots[0] = { kind: 'workshop', level: 1 };
   s.eventPlot = 0;
  }
  expect(actionReason(s, { type: 'event', index: choice })).toBe('');
  const next = resolve(s, choice);
  expect(next.eventActive).toBe(false);
  expect(next.emergenciesResolved).toBe(expected);
  const duplicate = cityAction(next, { type: 'event', index: choice, eventIndex });
  expect(duplicate.emergenciesResolved).toBe(expected);
  expect(duplicate.resources).toEqual(next.resources);
  const later = advanceCity(next, BALANCE.eventInterval);
  expect(cityAction(later, { type: 'event', index: choice, eventIndex }).emergenciesResolved).toBe(expected);
 });

 it('rejects unaffordable, invalid, inactive, and missing-target resolutions without progress', () => {
  const s = emergency();
  s.resources.gears = 0;
  expect(resolve(s, 0).emergenciesResolved).toBe(0);
  expect(resolve(s, 99).emergenciesResolved).toBe(0);
  expect(resolve({ ...s, eventActive: false }).emergenciesResolved).toBe(0);
  expect(resolve(emergency(5), 0).emergenciesResolved).toBe(0);
 });

 it('does not count event activation, offline work, skipped breakdowns, or expedition encounters', () => {
  const s = { ...freshCity(100000), eventIndex: 5 };
  const skipped = advanceCity(s, BALANCE.eventInterval);
  expect(skipped.eventIndex).toBe(6);
  expect(skipped.emergenciesResolved).toBe(0);
  const pending = advanceCity(freshCity(100000), 7200);
  expect(pending.eventActive).toBe(true);
  expect(pending.emergenciesResolved).toBe(0);
  const voyage = emergency();
  voyage.expedition = { destination: 0, endsAt: 100000, choice: null };
  expect(cityAction(voyage, { type: 'expeditionChoice', index: 1 }, 100000).emergenciesResolved).toBe(0);
 });

 it('requires the Industrial Quarter and two resolutions, then rewards once without extra guild delivery', () => {
  let s = emergency();
  expect(contractStatus(s, maintenance)).toBe('Locked');
  expect(cityAction(s, claim).resources).toEqual(s.resources);
  s = resolve(s);
  expect(s.emergenciesResolved).toBe(1);
  s.permits = ['industrial'];
  expect(contractStatus(s, maintenance)).toBe('In progress');
  expect(actionReason(s, claim)).toBe('Resolve 1 more city emergencies');
  s = resolve({ ...s, eventIndex: 2, eventActive: true }, 1);
  expect(s.emergenciesResolved).toBe(2);
  expect(s.contracts).toEqual([]);
  expect(contractStatus(s, maintenance)).toBe('Completed · Ready to claim');
  expect(cityAction({ ...s, permits: [] }, claim).resources).toEqual(s.resources);
  const next = cityAction(s, claim);
  expect(next.resources).toEqual({ ...s.resources, coins: s.resources.coins + 100, research: s.resources.research + 20 });
  expect(next.earned).toBe(s.earned + 100);
  expect(next.contracts).toEqual(['maintenance']);
  expect(next.emergenciesResolved).toBe(2);
  expect(next.actionFeedback).toBe(s.actionFeedback);
  expect(contractStatus(next, maintenance)).toBe('Claimed');
  expect(cityAction(next, claim).resources).toEqual(next.resources);
  expect(cityAction(next, claim).actionFeedback).toBe(next.actionFeedback);
 });

 it('loads old saves without guessing historical progress and validates counters', () => {
  for (const [value, expected] of [[undefined, 0], [-3, 0], ['2', 0], [1.9, 1], [Infinity, 0]] as const) {
   const restored = decodeCity(JSON.stringify({ version: 2, state: { ...emergency(), eventIndex: 100, emergenciesResolved: value } }))!;
   expect(restored.emergenciesResolved).toBe(expected);
  }
 });

 it('saves progress and claim state across reloads, including queued double clicks', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = emergency();
  s.permits = ['industrial'];
  writeCity(s);
  const hook = renderHook(() => useCity());
  act(() => {
   hook.result.current.act({ type: 'event', index: 1, eventIndex: 0 });
   hook.result.current.act({ type: 'event', index: 1, eventIndex: 0 });
  });
  expect(hook.result.current.state.emergenciesResolved).toBe(1);
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.emergenciesResolved).toBe(1);
  hook.unmount();
  const reloaded = renderHook(() => useCity());
  expect(reloaded.result.current.state.emergenciesResolved).toBe(1);
  reloaded.unmount();
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  writeCity({ ...saved, eventIndex: 2, eventActive: true });
  const second = renderHook(() => useCity());
  act(() => second.result.current.act({ type: 'event', index: 1, eventIndex: 2 }));
  const before = second.result.current.state.resources;
  act(() => { second.result.current.act(claim); second.result.current.act(claim); });
  expect(second.result.current.state.resources.coins).toBe(before.coins + 100);
  expect(second.result.current.state.resources.research).toBe(before.research + 20);
  expect(second.result.current.state.emergenciesResolved).toBe(2);
  second.unmount();
  const final = renderHook(() => useCity());
  expect(final.result.current.state.contracts).toContain('maintenance');
  expect(final.result.current.state.emergenciesResolved).toBe(2);
  act(() => final.result.current.act(claim));
  expect(final.result.current.state.resources.coins).toBe(before.coins + 100);
 });
});

describe('Contract presentation and actual panel actions', () => {
 it('shows all contracts and their objective, rewards, locks, progress, readiness and claim state', () => {
  const s = freshCity(100000);
  const game: CityGame = { state: s, loaded: true, now: 100000, saveError: false, act: vi.fn(), reset: vi.fn() };
  const ui = render(<Contracts game={game}/>);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.queryByRole('heading',{name:'City Maintenance Initiative'})).not.toBeInTheDocument();
  ui.rerender(<Contracts game={{...game,state:{...s,permits:['industrial']}}}/>);
  expect(card()).toHaveTextContent('0/2');
  expect(card()).toHaveTextContent('Reward: 100 Brass Coins · 20 Research');
  expect(card()).toHaveTextContent('Industrial Permit Required');
  expect(within(card()).getByRole('button', { name: 'Claim reward' })).toBeDisabled();
  const unlocked = { ...s, permits: ['industrial'], emergenciesResolved: 1 };
  ui.rerender(<Contracts game={{ ...game, state: unlocked }}/>);
  expect(card()).toHaveTextContent('1/2');
  expect(card()).toHaveTextContent('In progress');
  ui.rerender(<Contracts game={{ ...game, state: { ...unlocked, emergenciesResolved: 2 } }}/>);
  expect(card()).toHaveTextContent('2/2');
  expect(card()).toHaveTextContent('Completed · Ready to claim');
  fireEvent.click(within(card()).getByRole('button', { name: 'Claim reward' }));
  expect(game.act).toHaveBeenCalledExactlyOnceWith(claim);
  ui.rerender(<Contracts game={{ ...game, state: { ...unlocked, emergenciesResolved: 2, contracts: ['maintenance'] } }}/>);
  expect(screen.queryByRole('heading',{name:'City Maintenance Initiative'})).not.toBeInTheDocument();
  for (const c of CONTRACTS.filter(c => ['gears','firstscience','firstthousand'].includes(c.id))) {
   const article = screen.getByRole('heading', { name: c.title }).closest('article')!;
   expect(article).toHaveTextContent(c.description);
   expect(article).toHaveTextContent('Reward:');
  }
 });

 it('closing and reopening a real emergency does not count; objective completion shows the shared popup, not claiming', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = emergency();
  s.permits = ['industrial'];
  s.emergenciesResolved = 1;
  writeCity(s);
  function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback} combo={game.state.contractCombo}/><Contracts game={game}/><CityEvent game={game}/></>; }
  render(<City/>);
  expect(screen.queryByText('CONTRACT COMPLETE!')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(card()).toHaveTextContent('1/2');
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.eventActive).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Vent safely' }));
  expect(card()).toHaveTextContent('2/2');
  expect(screen.getByText('CONTRACT COMPLETE!')).toBeInTheDocument();
  fireEvent.click(within(card()).getByRole('button', { name: 'Claim reward' }));
  expect(screen.getAllByText('CONTRACT COMPLETE!')).toHaveLength(1);
  expect(screen.queryByRole('heading',{name:'City Maintenance Initiative'})).not.toBeInTheDocument();
 });
});
