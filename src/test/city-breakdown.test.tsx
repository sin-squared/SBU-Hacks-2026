import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityEvent } from '@/components/CityPanels';
import { CityManagement } from '@/components/CityManagement';
import { ActionPopup } from '@/components/ActionPopup';
import { BALANCE, CITY_EVENTS, type BuildingKind } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, freshCity, production, steamCapacity, type CityState } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity, type CityGame } from '@/hooks/useCity';

const breakdownIndex = CITY_EVENTS.findIndex(e => 'id' in e && e.id === 'equipment-breakdown');
function pending(kind: BuildingKind = 'workshop') {
 const s = freshCity(0);
 s.plots[0] = { kind, level: 2 };
 return { ...s, hasBuiltOilRig: true, eventIndex: breakdownIndex };
}
function broken(kind: BuildingKind = 'workshop') {
 return advanceCity(pending(kind), BALANCE.eventInterval, 0);
}
function gameFor(state: CityState): CityGame {
 return { state, loaded: true, now: 0, saveError: false, act: vi.fn(), reset: vi.fn() };
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Equipment breakdown rules', () => {
 it.each([
  { eventIndex: 0, label: 'Fit a new valve', price: 10 },
  { eventIndex: breakdownIndex, label: 'Repair the machine', price: 7 },
 ])('$label charges its increased displayed repair price and rejects the old price', ({ eventIndex, label, price }) => {
  const s = eventIndex === breakdownIndex ? broken() : { ...freshCity(0), eventIndex, eventActive: true };
  s.resources.gears = price;
  render(<CityEvent game={gameFor(s)}/>);
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  const button = screen.getByRole('button', { name: label });
  expect(button.parentElement).toHaveTextContent(`Cost: ${price} Gears`);
  expect(button).toBeEnabled();
  if (eventIndex === breakdownIndex) expect(button.parentElement).not.toHaveTextContent(/Reward:|No reward/i);
  const repaired = cityAction(s, { type: 'event', index: 0, eventIndex });
  expect(repaired.resources.gears).toBe(0);
  expect(repaired.eventActive).toBe(false);
  expect(cityAction(repaired, { type: 'event', index: 0, eventIndex }).resources.gears).toBe(0);
  const poor = { ...s, resources: { ...s.resources, gears: price - 1 } };
  expect(actionReason(poor, { type: 'event', index: 0 })).toBe('Need 1 Gears');
  const rejected = cityAction(poor, { type: 'event', index: 0 });
  expect(rejected.eventActive).toBe(true);
  expect(rejected.resources.gears).toBe(price - 1);
  expect(rejected.actionFeedback).toBe(s.actionFeedback);
 });

 it('has one definition and starts inactive without changing the interval', () => {
  expect(CITY_EVENTS.filter(e => 'id' in e && e.id === 'equipment-breakdown')).toHaveLength(1);
  expect(freshCity(0).eventActive).toBe(false);
  expect(freshCity(0).eventDue).toBe(BALANCE.eventInterval);
 });
 it('selects from occupied production plots once, using the supplied random roll', () => {
  const s = pending();
  s.plots[0] = null;
  s.plots[2] = { kind: 'bakery', level: 1 };
  s.plots[3] = { kind: 'boiler', level: 1 };
  expect(advanceCity(s, BALANCE.eventInterval - 1, .99).eventActive).toBe(false);
  for (const [roll, target] of [[0, 2], [.99, 3]] as const) {
   const next = advanceCity(s, BALANCE.eventInterval, roll);
   expect(next.eventPlot).toBe(target);
   expect(next.damagedPlots).toEqual([target]);
   expect(next.plots).toEqual(s.plots);
   expect(advanceCity(next, 100, 1 - roll).eventPlot).toBe(target);
   expect(advanceCity(next, 100, 1 - roll).damagedPlots).toEqual([target]);
  }
 });
 it('skips an empty-city breakdown without a stuck emergency or payout', () => {
  const s = { ...freshCity(0), eventIndex: breakdownIndex };
  const next = advanceCity(s, BALANCE.eventInterval);
  expect(next.eventActive).toBe(false);
  expect(next.eventIndex).toBe(breakdownIndex + 1);
  expect(next.eventDue).toBe(next.elapsed + BALANCE.eventInterval);
  expect(next.resources).toEqual(s.resources);
 });
 it('stops both outputs and inputs, while healthy buildings keep running', () => {
  const s = broken('laboratory');
  s.plots[2] = { kind: 'workshop', level: 1 };
  expect(production(s).input.gears).toBe(0);
  expect(production(s).output.research).toBe(0);
  const next = advanceCity(s, 10);
  expect(next.resources.research).toBe(s.resources.research);
  expect(next.resources.gears - s.resources.gears).toBeCloseTo(4.5);
  expect(next.resources.coins - s.resources.coins).toBeCloseTo(3);
 });
 it('stops production at the due time during offline catch-up', () => {
  const s = pending();
  const next = advanceCity(s, BALANCE.eventInterval + 100);
  expect(next.resources.coins - s.resources.coins).toBeCloseTo(.3 * 1.2 * BALANCE.eventInterval);
  expect(next.resources.gears - s.resources.gears).toBeCloseTo(.45 * 1.2 * BALANCE.eventInterval);
  expect(next.elapsed).toBe(BALANCE.eventInterval + 100);
  expect(next.eventActive).toBe(true);
 });
 it('removes a damaged boiler boost consistently but retains its physical storage', () => {
  const s = broken('boiler');
  s.resources.steam = 20;
  s.plots[1] = { kind: 'factory', level: 1 };
  expect(steamCapacity(s)).toBe(BALANCE.baseSteamCapacity + 2 * BALANCE.boilerCapacity);
  expect(production(s).output.steam).toBe(0);
  expect(production(s).output.gears).toBeCloseTo(1.5);
  const next = advanceCity(s, 1);
  expect(next.resources.gears - s.resources.gears).toBeCloseTo(1.5);
  expect(next.resources.steam).toBeCloseTo(19.4);
 });
 it('repairs for exactly seven gears, retains the level, and resumes production', () => {
  const s = broken();
  const choice = { type: 'event', index: 0, eventIndex: breakdownIndex } as const;
  const repaired = cityAction(s, choice);
  expect(repaired.resources.gears).toBe(s.resources.gears - 7);
  expect(repaired.resources.coins).toBe(s.resources.coins);
  expect(repaired.plots).toEqual(s.plots);
  expect(repaired.damagedPlots).toEqual([]);
  expect(repaired.eventPlot).toBe(null);
  expect(repaired.eventActive).toBe(false);
  expect(repaired.eventDue).toBe(repaired.elapsed + BALANCE.eventInterval);
  expect(advanceCity(repaired, 1).resources.gears).toBeCloseTo(repaired.resources.gears + .54);
  expect(cityAction(repaired, choice).resources).toEqual(repaired.resources);
  const later = advanceCity(repaired, BALANCE.eventInterval);
  expect(cityAction(later, choice).resources).toEqual(later.resources);
 });
 it('does not resolve or charge an unaffordable repair', () => {
  const s = broken();
  s.resources.gears = 6;
  expect(actionReason(s, { type: 'event', index: 0 })).toContain('Need 1 Gears');
  const next = cityAction(s, { type: 'event', index: 0 });
  expect(next.resources).toEqual(s.resources);
  expect(next.damagedPlots).toEqual(s.damagedPlots);
  expect(next.eventActive).toBe(true);
 });
 it('scraps once for ten coins, frees only the target, and clamps steam to the new capacity', () => {
  const s = broken('boiler');
  s.resources.steam = steamCapacity(s);
  s.plots[2] = { kind: 'workshop', level: 3 };
  const choice = { type: 'event', index: 1, eventIndex: breakdownIndex } as const;
  const next = cityAction(s, choice);
  expect(next.resources.coins).toBe(s.resources.coins + 10);
  expect(next.earned).toBe(s.earned + 10);
  expect(next.resources.gears).toBe(s.resources.gears);
  expect(next.resources.steam).toBe(BALANCE.baseSteamCapacity);
  expect(next.plots[0]).toBe(null);
  expect(next.plots[2]).toEqual(s.plots[2]);
  expect(next.damagedPlots).toEqual([]);
  expect(cityAction(next, choice).resources).toEqual(next.resources);
  expect(actionReason(next, { type: 'construct', plot: 0, kind: 'workshop' })).toBe('');
  expect(cityAction(next, { type: 'construct', plot: 0, kind: 'workshop' }).damagedPlots).toEqual([]);
 });
 it('blocks upgrading or ordinary demolition of the damaged target', () => {
  const s = broken();
  for (const type of ['upgrade', 'demolish'] as const) {
   expect(actionReason(s, { type, plot: 0 })).toBe('Building damaged');
   const next = cityAction(s, { type, plot: 0 });
   expect(next.plots).toEqual(s.plots);
   expect(next.resources).toEqual(s.resources);
  }
 });
 it('round-trips damage and resolution through the real save envelope', () => {
  const s = broken();
  expect(writeCity(s)).toBe(true);
  const restored = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 0)!;
  expect(restored.damagedPlots).toEqual([0]);
  expect(restored.eventPlot).toBe(0);
  expect(advanceCity(restored, 100).resources).toEqual(restored.resources);
  for (const index of [0, 1]) {
   const resolved = cityAction(restored, { type: 'event', index });
   expect(writeCity(resolved)).toBe(true);
   const reloaded = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!, 0)!;
   expect(reloaded.damagedPlots).toEqual([]);
   expect(reloaded.eventPlot).toBe(null);
   expect(cityAction(reloaded, { type: 'event', index }).resources).toEqual(reloaded.resources);
  }
 });
 it('loads older v2 saves and sanitizes invalid or orphaned damage', () => {
  const s = pending();
  const decode = (extra: object) => decodeCity(JSON.stringify({ version: 2, state: { ...s, ...extra } }), 0)!;
  const old = decode({ damagedPlots: undefined, eventPlot: undefined, eventActive: true });
  expect(advanceCity(old, 0).damagedPlots).toEqual([0]);
  const invalid = decode({ eventActive: true, eventPlot: 99, damagedPlots: [-1, 99, 1.5, '0', 2, 0, 0] });
  expect(invalid.eventPlot).toBe(0);
  expect(invalid.damagedPlots).toEqual([0]);
  expect(decode({ eventActive: false, damagedPlots: [0], eventPlot: 0 }).damagedPlots).toEqual([]);
 });
});

describe('Equipment breakdown UI and state management', () => {
 it('shows the existing vignette with the actual scrap popup once and never replays it on reload', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = broken();
  writeCity(s);
  function City() {
   const game = useCity();
   return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/>
    <button onClick={() => {
     game.act({ type: 'event', index: 1, eventIndex: breakdownIndex });
     game.act({ type: 'event', index: 1, eventIndex: breakdownIndex });
    }}>Repeat scrap</button></>;
  }
  const ui = render(<StrictMode><City/></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Scrap the machine for 10 coins' }));
  expect(screen.getByRole('status')).toHaveTextContent('BUILDING SCRAPPED!');
  const overlay = document.querySelector('.failure-vignette')!;
  expect(overlay).toHaveClass('pointer-events-none', 'fixed', 'inset-0', 'z-[55]');
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(saved.plots[0]).toBe(null);
  expect(saved.resources.coins).toBe(s.resources.coins + 10);
  expect(saved.damagedPlots).toEqual([]);
  act(() => vi.advanceTimersByTime(500));
  fireEvent.click(screen.getByRole('button', { name: 'Repeat scrap' }));
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.resources.coins).toBe(saved.resources.coins);
  expect(document.querySelectorAll('.failure-vignette')).toHaveLength(1);
  ui.rerender(<StrictMode><City/></StrictMode>);
  act(() => vi.advanceTimersByTime(749));
  expect(overlay).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(overlay).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  ui.unmount();
  render(<City/>);
  expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
 });

 it('does not trigger a scrap vignette for repairs, ordinary demolition or rejected scrap actions', () => {
  const repaired = cityAction(broken(), { type: 'event', index: 0, eventIndex: breakdownIndex });
  const demolished = cityAction(repaired, { type: 'demolish', plot: 0 });
  const rejected = cityAction({ ...broken(), eventPlot: null }, { type: 'event', index: 1, eventIndex: breakdownIndex });
  for (const state of [repaired, demolished, rejected]) {
   expect(state.actionFeedback?.effect).toBeUndefined();
   const ui = render(<ActionPopup feedback={state.actionFeedback}/>);
   expect(document.querySelector('.failure-vignette')).not.toBeInTheDocument();
   ui.unmount();
  }
  expect(rejected.plots[0]).not.toBe(null);
 });

 it('names the building and lets the panel close and reopen without dispatching a resolution', () => {
  const game = gameFor(broken());
  render(<CityEvent game={game}/>);
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Clockwork Workshop on plot 1');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(game.act).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(game.act).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Repair the machine' }));
  expect(game.act).toHaveBeenCalledExactlyOnceWith({ type: 'event', index: 0, eventIndex: breakdownIndex });
 });
 it('disables unaffordable repair but offers scrap and marks the damaged plot', () => {
  const s = broken();
  s.resources.gears = 6;
  const game = gameFor(s);
  render(<><CityManagement game={game}/><CityEvent game={game}/></>);
  expect(screen.getByText('Damaged · Paused')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Upgrade' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Demolish' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /City Alert/ }));
  expect(screen.getByRole('button', { name: 'Repair the machine' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Scrap the machine for 10 coins' }));
  expect(game.act).toHaveBeenCalledExactlyOnceWith({ type: 'event', index: 1, eventIndex: breakdownIndex });
 });
 it('saves committed repairs once even with queued double-clicks and reloads', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = broken();
  writeCity(s);
  const { result, unmount } = renderHook(() => useCity());
  expect(result.current.state.damagedPlots).toEqual([0]);
  const before = result.current.state.resources.gears;
  act(() => {
   result.current.act({ type: 'event', index: 0, eventIndex: breakdownIndex });
   result.current.act({ type: 'event', index: 0, eventIndex: breakdownIndex });
  });
  expect(result.current.state.resources.gears).toBe(before - 7);
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(saved.resources.gears).toBe(before - 7);
  expect(saved.damagedPlots).toEqual([]);
  unmount();
  const reloaded = renderHook(() => useCity());
  expect(reloaded.result.current.state.resources.gears).toBe(before - 7);
  expect(reloaded.result.current.state.damagedPlots).toEqual([]);
 });
 it('supplies randomness outside the reducer when the online event activates', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.spyOn(Math, 'random').mockReturnValue(.99);
  const s = pending();
  s.plots[3] = { kind: 'bakery', level: 1 };
  writeCity(s);
  const { result } = renderHook(() => useCity());
  act(() => vi.advanceTimersByTime(BALANCE.eventInterval * 1000));
  expect(result.current.state.eventPlot).toBe(3);
  expect(result.current.state.damagedPlots).toEqual([3]);
 });
});
