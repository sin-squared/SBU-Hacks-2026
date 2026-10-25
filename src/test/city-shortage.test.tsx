import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityEvent } from '@/components/CityPanels';
import { ActionPopup } from '@/components/ActionPopup';
import { BALANCE, CITY_EVENTS } from '@/game/city-config';
import { actionReason, advanceCity, cityAction, freshCity, production } from '@/game/city';
import { CITY_SAVE_KEY, decodeCity, writeCity } from '@/game/city-save';
import { useCity, type CityGame } from '@/hooks/useCity';

const shortageIndex = CITY_EVENTS.findIndex(e => e.title === 'Supply Shortage');
const choices = [
 { index: 0, label: 'Buy Emergency Supplies', coins: 35, steam: 0, gears: 18, popup: 'SUPPLIES SECURED!' },
 { index: 1, label: 'Salvage Materials', coins: 0, steam: 5, gears: 6, popup: 'TEMPORARY FIX!' },
 { index: 2, label: 'Wait for Production', coins: 0, steam: 0, gears: 0, popup: 'PROBLEMS MAY WORSEN...' },
] as const;
function pending() {
 const s = freshCity(100000);
 return { ...s, hasBuiltOilRig: true, eventIndex: shortageIndex, eventActive: true, resources: { ...s.resources, coins: 35, steam: 5 } };
}
function openAlert() { fireEvent.click(screen.getByRole('button', { name: /City Alert/ })); }
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('Supply Shortage', () => {
 it('updates the existing third event without adding or reordering events', () => {
  expect(CITY_EVENTS).toHaveLength(7);
  expect(CITY_EVENTS.filter(e => /shortage/i.test(e.title))).toHaveLength(1);
  expect(shortageIndex).toBe(2);
  expect(CITY_EVENTS[shortageIndex]?.description).toContain('city is running low on resources');
  expect(CITY_EVENTS[shortageIndex]?.options.map(o => o.label)).toEqual(choices.map(c => c.label));
 });

 it.each(choices)('$label applies the exact exchange once, including at the affordability boundary', choice => {
  const s = pending();
  const action = { type: 'event', index: choice.index, eventIndex: shortageIndex } as const;
  expect(actionReason(s, action)).toBe('');
  const next = cityAction(s, action);
  expect(next.resources).toEqual({
   ...s.resources,
   coins: s.resources.coins - choice.coins,
   steam: s.resources.steam - choice.steam,
   gears: s.resources.gears + choice.gears,
  });
  expect(next.earned).toBe(s.earned);
  expect(next.plots).toEqual(s.plots);
  expect(next.eventActive).toBe(false);
  expect(next.eventIndex).toBe(shortageIndex + 1);
  expect(next.eventDue).toBe(s.elapsed + BALANCE.eventInterval);
  expect(next.shortageSeconds).toBe(choice.index === 2 ? 60 : 0);
  expect(next.actionFeedback).toEqual({ id: 1, message: choice.popup });
  expect(cityAction(next, action).resources).toEqual(next.resources);
  expect(cityAction(next, action).shortageSeconds).toBe(next.shortageSeconds);
  const later = advanceCity(next, BALANCE.eventInterval);
  expect(later.eventActive).toBe(true);
  const stale = cityAction(later, action);
  expect(stale.resources).toEqual(later.resources);
  expect(stale.eventIndex).toBe(later.eventIndex);
  expect(stale.eventActive).toBe(true);
 });

 it.each([
  { index: 0, resource: 'coins', amount: 34, reason: 'Need 1 Brass Coins' },
  { index: 1, resource: 'steam', amount: 4, reason: 'Need 1 Steam Components' },
 ] as const)('rejects option $index when its cost cannot be paid', ({ index, resource, amount, reason }) => {
  const s = pending();
  s.resources[resource] = amount;
  const action = { type: 'event', index, eventIndex: shortageIndex } as const;
  expect(actionReason(s, action)).toBe(reason);
  const next = cityAction(s, action);
  expect(next.resources).toEqual(s.resources);
  expect(next.eventActive).toBe(true);
  expect(next.eventIndex).toBe(shortageIndex);
  expect(next.notice).toBe(reason);
  expect(next.actionFeedback).toBe(null);
  expect(next.shortageSeconds).toBe(0);
 });

 it('shows all three exchanges, explains disabled choices, and closes without resolving', () => {
  const s = pending();
  s.resources.coins = 0;
  s.resources.steam = 0;
  const game: CityGame = { state: s, loaded: true, now: 100000, saveError: false, act: vi.fn(), reset: vi.fn() };
  render(<CityEvent game={game}/>);
  openAlert();
  expect(screen.getByRole('dialog')).toHaveTextContent('city is running low on resources');
  expect(screen.getByRole('dialog')).toHaveTextContent('All output from buildings that produce Gears is reduced by 50% for 60 seconds of game time. Input consumption is unchanged.');
  const expected = [
   { label: 'Buy Emergency Supplies', cost: 'Cost: 35 Brass Coins', reward: 'Reward: 18 Gears', reason: 'Need 35 Brass Coins' },
   { label: 'Salvage Materials', cost: 'Cost: 5 Steam Components', reward: 'Reward: 6 Gears', reason: 'Need 5 Steam Components' },
   { label: 'Wait for Production', cost: 'Cost: Nothing', reward: '', reason: '' },
  ];
  for (const option of expected) {
   const button = screen.getByRole('button', { name: option.label });
   const card = button.parentElement!;
   expect(card).toHaveTextContent(option.cost);
   if (option.reward) expect(card).toHaveTextContent(option.reward);
   else expect(card).not.toHaveTextContent(/Reward:|No reward|No direct reward/i);
   if (option.reason) {
    expect(button).toBeDisabled();
    expect(within(card).getByText(option.reason)).toBeInTheDocument();
    fireEvent.click(button);
   } else expect(button).toBeEnabled();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(game.act).not.toHaveBeenCalled();
  openAlert();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(game.act).not.toHaveBeenCalled();
  openAlert();
  fireEvent.click(screen.getByRole('button', { name: 'Wait for Production' }));
  expect(game.act).toHaveBeenCalledExactlyOnceWith({ type: 'event', index: 2, eventIndex: shortageIndex });
 });

 it.each(choices)('$label persists once through the real hook, queued clicks, and reload', choice => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = pending();
  expect(writeCity(s)).toBe(true);
  const pendingLoad = renderHook(() => useCity());
  expect(pendingLoad.result.current.state.eventActive).toBe(true);
  expect(pendingLoad.result.current.state.resources).toEqual(s.resources);
  pendingLoad.unmount();
  const hook = renderHook(() => useCity());
  expect(hook.result.current.state.eventActive).toBe(true);
  expect(hook.result.current.state.eventIndex).toBe(shortageIndex);
  const action = { type: 'event', index: choice.index, eventIndex: shortageIndex } as const;
  act(() => {
   hook.result.current.act(action);
   hook.result.current.act(action);
  });
  const expected = { ...s.resources, coins: s.resources.coins - choice.coins, steam: s.resources.steam - choice.steam, gears: s.resources.gears + choice.gears };
  expect(hook.result.current.state.resources).toEqual(expected);
  const saved = decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)!;
  expect(saved.resources).toEqual(expected);
  expect(saved.eventActive).toBe(false);
  expect(saved.eventIndex).toBe(shortageIndex + 1);
  expect(saved.shortageSeconds).toBe(choice.index === 2 ? 60 : 0);
  expect(saved.actionFeedback).toBe(null);
  hook.unmount();
  const reloaded = renderHook(() => useCity());
  expect(reloaded.result.current.state.resources).toEqual(expected);
  expect(reloaded.result.current.state.eventActive).toBe(false);
  act(() => reloaded.result.current.act(action));
  expect(reloaded.result.current.state.resources).toEqual(expected);
 });

 it('halves actual and displayed output of Gear-producing buildings after waiting', () => {
  const s = pending();
  s.resources.coins = 0;
  s.resources.steam = 0;
  s.plots[0] = { kind: 'workshop', level: 1 };
  const next = cityAction(s, { type: 'event', index: 2, eventIndex: shortageIndex });
  expect(next.resources).toEqual(s.resources);
  const produced = advanceCity(next, 1);
  expect(production(next).output.coins).toBeCloseTo(.15);
  expect(production(next).output.gears).toBeCloseTo(.225);
  expect(produced.resources.coins).toBeCloseTo(.15);
  expect(produced.resources.gears).toBeCloseTo(s.resources.gears + .225);
  expect(produced.shortageSeconds).toBe(59);
 });

 it('expires at exactly 60 game seconds, including fractional ticks and offline catch-up', () => {
  const s = pending();
  s.plots[0] = { kind: 'workshop', level: 1 };
  const waiting = cityAction(s, { type: 'event', index: 2, eventIndex: shortageIndex });
  waiting.eventDue = 1e9;
  expect(advanceCity(waiting, 0).shortageSeconds).toBe(60);
  expect(advanceCity(waiting, -10).shortageSeconds).toBe(60);
  const almost = advanceCity(waiting, 59.75);
  expect(almost.shortageSeconds).toBeCloseTo(.25);
  const expired = advanceCity(almost, 1);
  expect(expired.shortageSeconds).toBe(0);
  expect(expired.resources.gears - almost.resources.gears).toBeCloseTo(.225 * .25 + .45 * .75);
  expect(production(expired).output.gears).toBeCloseTo(.45);
  const offline = advanceCity(waiting, 90);
  expect(offline.resources.gears - s.resources.gears).toBeCloseTo(.225 * 60 + .45 * 30);
  expect(offline.resources.coins - s.resources.coins).toBeCloseTo(.15 * 60 + .3 * 30);
  expect(offline.shortageSeconds).toBe(0);
 });

 it('leaves non-Gear buildings and all input consumption unchanged, including technology and boiler bonuses', () => {
  const s = pending();
  s.permits = ['industrial'];
  s.technologies = ['boilers', 'automation'];
  s.resources.steam = 100;
  s.plots[0] = { kind: 'factory', level: 2 };
  s.plots[1] = { kind: 'boiler', level: 2 };
  s.plots[2] = { kind: 'bakery', level: 1 };
  s.plots[3] = { kind: 'laboratory', level: 1 };
  const waiting = cityAction(s, { type: 'event', index: 2, eventIndex: shortageIndex });
  const normal = production(s);
  const reduced = production(waiting);
  expect(reduced.output.gears).toBeCloseTo(normal.output.gears * .5);
  expect(reduced.output.coins).toBeCloseTo(1 * 1.2 * 1.25 * .5 + 2.5 * 1.25);
  expect(reduced.output.steam).toBe(normal.output.steam);
  expect(reduced.output.research).toBe(normal.output.research);
  expect(reduced.input).toEqual(normal.input);
  const next = advanceCity(waiting, 1);
  for (const resource of ['coins', 'gears', 'steam', 'research'] as const) {
   expect(next.resources[resource] - waiting.resources[resource]).toBeCloseTo(reduced.output[resource] - reduced.input[resource]);
  }
  waiting.damagedPlots = [0];
  expect(production(waiting).output.gears).toBe(0);
 });

 it('preserves remaining duration through save/reload and expires correctly while offline', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = pending();
  s.plots[0] = { kind: 'workshop', level: 1 };
  const resolved = cityAction(s, { type: 'event', index: 2 }); resolved.eventDue = 1e9;
  const waiting = advanceCity(resolved, 20);
  expect(writeCity(waiting)).toBe(true);
  expect(decodeCity(localStorage.getItem(CITY_SAVE_KEY)!)?.shortageSeconds).toBe(40);
  vi.setSystemTime(110000);
  const hook = renderHook(() => useCity());
  expect(hook.result.current.state.shortageSeconds).toBe(30);
  expect(hook.result.current.state.resources.gears - waiting.resources.gears).toBeCloseTo(.225 * 10);
  expect(hook.result.current.state.actionFeedback).toBe(null);
  act(() => vi.advanceTimersByTime(35000));
  expect(hook.result.current.state.shortageSeconds).toBe(0);
  expect(production(hook.result.current.state).output.gears).toBeCloseTo(.45);
  hook.unmount();
  vi.setSystemTime(200000);
  const reload = renderHook(() => useCity());
  expect(reload.result.current.state.shortageSeconds).toBe(0);
 });

 it('defaults old saves to no penalty and validates the remaining duration', () => {
  for (const [value, expected] of [[undefined, 0], [-5, 0], ['60', 0], [1000, 60], [12.5, 12.5]] as const) {
   const restored = decodeCity(JSON.stringify({ version: 2, state: { ...pending(), shortageSeconds: value, actionFeedback: { id: 2, message: 'stale' } } }));
   expect(restored?.shortageSeconds).toBe(expected);
   expect(restored?.actionFeedback).toBe(null);
  }
 });

 it('does not restart the penalty or popup on a stale repeated wait action', () => {
  const action = { type: 'event', index: 2, eventIndex: shortageIndex } as const;
  const next = advanceCity(cityAction(pending(), action), 10);
  const repeated = cityAction(next, action);
  expect(repeated.shortageSeconds).toBe(50);
  expect(repeated.actionFeedback).toBe(next.actionFeedback);
 });

 it.each(choices)('$label displays its popup only after the real reducer processes a valid choice', choice => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  writeCity(pending());
  function City() { const game = useCity(); return <><ActionPopup feedback={game.state.actionFeedback}/><CityEvent game={game}/></>; }
  render(<City/>);
  expect(screen.queryByText(choice.popup)).not.toBeInTheDocument();
  openAlert();
  fireEvent.click(screen.getByRole('button', { name: choice.label }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const popup = screen.getByText(choice.popup).closest('[role="status"]')!;
  expect(popup).toHaveAttribute('data-phase', 'visible');
  act(() => vi.advanceTimersByTime(1250));
  expect(popup).toHaveAttribute('data-phase', 'fading');
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByText(choice.popup)).not.toBeInTheDocument();
 });

 it('never displays a success popup for a rejected action or a closed panel', () => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  const s = pending();
  s.resources.coins = 0;
  writeCity(s);
  const hook = renderHook(() => useCity());
  const ui = render(<CityEvent game={hook.result.current}/>);
  openAlert();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(hook.result.current.state.eventActive).toBe(true);
  act(() => hook.result.current.act({ type: 'event', index: 0, eventIndex: shortageIndex }));
  ui.rerender(<CityEvent game={hook.result.current}/>);
  expect(hook.result.current.state.eventActive).toBe(true);
  expect(hook.result.current.state.actionFeedback).toBe(null);
  for (const choice of choices) expect(screen.queryByText(choice.popup)).not.toBeInTheDocument();
 });
});
